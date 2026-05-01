# Implementation Plan: SSE Message Streaming

**Date**: 2026-04-29
**Status**: Draft — pending review
**Origin**: Extracted from `.plan/scaling-plan-100-concurrent-users.md` § 1.1
**Reason for split**: Streaming touches the full stack (LLM SDK → FastAPI → Node → nginx → frontend EventSource). It requires close frontend/backend collaboration and warrants its own design doc and PR sequence rather than living inside the broader scaling plan.

---

## Goal

Stream the **therapy reply (Step 2)** token-by-token from the LLM all the way to the browser so the user sees the first words within ~1s of Step 2 starting, instead of waiting 5–15s for the full response.

Steps 0 (summary) and 1 (knowledge selection) remain non-streaming — they run before Step 2 begins, and their outputs feed into Step 2's prompt. Only the final user-facing reply streams.

---

## Current Flow vs Target Flow

**Current (non-streaming):**
```
Browser  ──POST /api/chat/.../messages──►  Node  ──fetch /generate──►  Inference
                                                                          │
                                                          (Step 0 → Step 1 → Step 2 await full text)
                                                                          │
Browser  ◄──────────── single JSON {assistantMessage} ──────────────── Node
   (user stares at spinner for 5–15s)
```

**Target (SSE):**
```
Browser  ──POST .../messages/stream──►  Node  ──fetch /generate/stream──►  Inference
   ▲                                       ▲                                  │
   │                                       │                          (Steps 0+1 await)
   │                                       │                                  │
   │                                       │                          (Step 2 streams chunks)
   │  data: {token}                        │  data: {token}                   │
   │◄────────── SSE ──────────────────────┤◄────── SSE chunks ──────────────┤
   │  data: [DONE]                         │  data: [DONE] + final {messageId, fullText}
```

---

## Stack-by-Stack Work

### A. LLM SDK layer — `inference/src/providers/`

**Both providers natively support streaming. No custom token generation needed.**

#### `gemini.py`
```python
async def generate_stream(prompt, system, history):
    stream = await _client.aio.models.generate_content_stream(
        model=MODEL,
        contents=...,
        config=genai.types.GenerateContentConfig(
            system_instruction=system,
            ...
        ),
    )
    async for chunk in stream:
        if chunk.text:
            yield chunk.text
```

#### `anthropic.py`
```python
async def generate_stream(prompt, system, history):
    async with _client.messages.stream(
        model=MODEL,
        system=system,
        messages=...,
        max_tokens=MAX_TOKENS,
    ) as stream:
        async for text in stream.text_stream:
            yield text
```

**Risks**:
- Need to capture the **full assembled text** at end-of-stream for DB persistence (Node writes the assistant message row only after the full reply is collected). Both SDKs expose this — Anthropic via `await stream.get_final_message()`, Gemini by accumulating chunks ourselves.
- Token usage / finish_reason should still be surfaced to the caller after the stream completes (for logging / future cost tracking).

---

### B. Inference HTTP layer — `inference/src/router.py` + `main.py`

Add a new endpoint:

```python
from fastapi.responses import StreamingResponse

@app.post("/generate/stream")
async def generate_stream(req: GenerateRequest):
    # Steps 0 + 1 (non-streaming, normal awaits)
    knowledge = await pick_knowledge(...)
    system = build_system_prompt(req.chatbot_type, knowledge)

    async def event_source():
        full_text = []
        try:
            async for token in provider.generate_stream(...):
                full_text.append(token)
                # SSE frame
                yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'fullText': ''.join(full_text)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
```

**Design notes**:
- Use `text/event-stream` with `data: <json>\n\n` framing (standard SSE).
- Emit a final `done` event carrying the assembled `fullText` so Node can persist without re-assembling tokens itself.
- Emit `error` events instead of HTTP error codes mid-stream (status was already 200 by the time streaming starts).
- `X-Accel-Buffering: no` tells nginx not to buffer this specific response.

---

### C. Node backend — `src/utils/llm.js` + new route

#### New route: `src/routes/chat.js`
`POST /api/chat/sessions/:id/messages/stream`

#### Controller / handler
```js
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.flushHeaders();

const upstream = await fetch(`${INFERENCE_URL}/generate/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
  body: JSON.stringify({ ... }),
});

let fullText = '';
let assistantMessageId = null;

const reader = upstream.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // Split on SSE frame boundary
  const frames = buffer.split('\n\n');
  buffer = frames.pop();  // keep incomplete tail

  for (const frame of frames) {
    if (!frame.startsWith('data: ')) continue;
    const payload = JSON.parse(frame.slice(6));

    if (payload.type === 'token') {
      fullText += payload.text;
      res.write(`data: ${JSON.stringify({ type: 'token', text: payload.text })}\n\n`);
    } else if (payload.type === 'done') {
      // Persist the full assistant message NOW
      const msg = await prisma.message.create({ data: { sessionId, role: 'assistant', content: fullText } });
      res.write(`data: ${JSON.stringify({ type: 'done', messageId: msg.id })}\n\n`);
    } else if (payload.type === 'error') {
      res.write(`data: ${JSON.stringify({ type: 'error', message: payload.message })}\n\n`);
    }
  }
}

res.end();
```

**Handle**:
- **Client disconnect mid-stream** — listen on `req.on('close', () => upstream.body.cancel())` so we don't keep streaming tokens to a dead socket and waste LLM tokens.
- **DB write on partial stream** — if user disconnects after N tokens, do we still save the partial reply? Recommendation: **yes, with a `truncated: true` flag** so the next session-history fetch shows what the user saw.
- **Error after some tokens already flushed** — must surface as an SSE `error` event, not HTTP 500.

#### Keep the legacy non-streaming endpoint
Don't delete `POST /api/chat/sessions/:id/messages`. Keep it for:
- API clients that don't speak SSE
- Background / programmatic flows (e.g., test scripts)
- Fallback if the stream endpoint fails

---

### D. Nginx — `nginx/conf.d/default.conf`

Add a streaming-aware location block (or apply to `/api/`):
```nginx
location /api/chat/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    chunked_transfer_encoding on;
}
```

Key: **`proxy_buffering off`** is mandatory — without it nginx holds tokens until a buffer fills.

---

### E. Frontend

This is where the most user-visible change lives.

#### Option 1 — `EventSource` (read-only, GET only)
Doesn't fit because we POST a message body. **Not viable** without payload-via-querystring hack.

#### Option 2 — `fetch` + `ReadableStream` (recommended)
```js
const resp = await fetch(`/api/chat/sessions/${id}/messages/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
  body: JSON.stringify({ content }),
});

const reader = resp.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let displayedText = '';

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const frames = buffer.split('\n\n');
  buffer = frames.pop();

  for (const frame of frames) {
    if (!frame.startsWith('data: ')) continue;
    const evt = JSON.parse(frame.slice(6));
    if (evt.type === 'token') {
      displayedText += evt.text;
      updateAssistantBubble(displayedText);
    } else if (evt.type === 'done') {
      finalizeAssistantBubble(evt.messageId, displayedText);
    } else if (evt.type === 'error') {
      showError(evt.message);
    }
  }
}
```

**Frontend changes**:
- Chat composable: switch from `await api.post(...)` returning JSON to streaming reader
- Assistant message bubble: render in "streaming" state (cursor / typing indicator), then switch to "final" state on `done`
- Abort handling: if user navigates away or hits Stop button, call `reader.cancel()` AND fire a `DELETE /api/chat/sessions/:id/messages/streaming` (or similar) so backend can cancel upstream. Initial version can skip the explicit cancel API and just rely on `req.on('close')`.

---

## Implementation Phases (one PR each)

| # | Branch | Scope |
|---|--------|-------|
| 1 | `feat/inference-streaming-endpoint` | Add `provider.generate_stream` for both providers + `/generate/stream` FastAPI endpoint. Unit test the generators with a fake SDK. |
| 2 | `feat/backend-sse-passthrough` | Add Node streaming route, SSE framing, DB persist on `done`, abort handling. Vitest for the framing logic with a mocked inference upstream. |
| 3 | `chore/nginx-sse-config` | `proxy_buffering off`, longer timeouts, chunked encoding for `/api/chat/`. Smoke test under `docker-compose.test.yml`. |
| 4 | `feat/frontend-streaming-chat` | Vue composable + bubble rendering changes. Manual test with backend running. |

Each PR can ship and be reverted independently. The legacy non-streaming endpoint stays alive throughout — frontend opts in only in PR #4.

---

## Open Questions

1. **Persist partial messages on disconnect?** Default: yes, with `truncated: true` flag. Needs a Prisma schema change (`prisma/schema.prisma` adds `truncated Boolean @default(false)` on `Message`).
2. **Streaming for Step 0 / Step 1?** No — they're internal selector LLMs whose output isn't shown to user. Streaming them adds complexity for zero UX win.
3. **Token usage / cost logging** — where? Recommend: emit a final `usage` SSE event with input/output tokens, log on Node side after `done`.
4. **Rate limiting interaction with SSE** — long-lived connections complicate per-minute counters. Recommend: count the request at start, not per-token.
5. **Auth on SSE** — JWT cookie/header is sent on the initial fetch like any POST. No special handling needed.

---

## Success Criteria

- [ ] First token visible in browser within 2s of submit (P50)
- [ ] Full reply rendered without page jank (60fps during streaming)
- [ ] Client disconnect cancels upstream LLM call (verified via inference logs)
- [ ] Partial message persisted with `truncated` flag when disconnect occurs after first token
- [ ] Legacy non-streaming endpoint still works (regression-tested)
- [ ] No nginx 504 / buffering issues under 50 concurrent streamed sessions

---

## Out of Scope (future)

- WebSocket-based bidirectional chat (separate plan; streaming is a prerequisite)
- Streaming Step 0 / Step 1 selector outputs
- Multi-region / edge streaming optimizations
