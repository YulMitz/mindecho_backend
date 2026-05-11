# Implementation Plan: Scaling Mind Echo for ~100 Concurrent Users

**Date**: 2026-04-08
**Status**: Draft — pending review and modification

---

## Current Architecture Bottlenecks

Current flow per chat message: **3 sequential LLM calls** (summary → knowledge selection → therapy response), single uvicorn worker, single Node.js backend, no streaming, no queuing, no rate limiting.

```
nginx → 1x Node.js backend → 1x Python FastAPI (1 worker) → 3x serial LLM API calls
```

Under 100 concurrent users, that's potentially **300 simultaneous LLM API calls** with no backpressure.

### Identified Bottlenecks

| Bottleneck | Severity | Detail |
|-----------|----------|--------|
| 3 sequential LLM calls per message | CRITICAL | Each call takes 2-15s. Total TTFR is the sum of all three. |
| Single uvicorn worker | CRITICAL | `main.py` line 21 defaults to 1 worker process. |
| Single backend container | HIGH | One Node.js process handles all concurrent connections. |
| No streaming | HIGH | Client waits for entire LLM response (10-30s). |
| New LLM client per request | MEDIUM | `gemini.py` and `anthropic.py` instantiate new clients every call — TLS overhead. |
| No request queuing or backpressure | HIGH | 100 users = 300 simultaneous LLM API calls, no admission control. |
| No rate limiting | MEDIUM | A single user can monopolize inference capacity. |
| Nginx timeout 60s | MEDIUM | Under load, 3-step LLM calls can exceed 60s → 504. |
| Duplicate PrismaClient instances | LOW | `chatService.js` and `llm.js` create separate instances instead of using the singleton from `database.js`. |
| Postgres port exposed in prod | LOW | `docker-compose.prod.yml` line 79 still maps host port. |
| Gzip not configured for JSON | LOW | `nginx.conf` has gzip on but `gzip_types` is commented out. |

---

## Phase 1: Quick Wins (1-2 days)

### 1.1 SSE Streaming for Chat Responses → **moved to its own plan**

**Status**: Extracted to `.plan/sse-message-streaming.md` because streaming requires
close frontend/backend collaboration (LLM SDK → FastAPI → Node → nginx → Vue) and
warrants its own design document and multi-PR sequence rather than living as a
quick-win bullet. See that plan for full details. Phase 1 here remains otherwise
unchanged; SSE is no longer a prerequisite for Phase 2.

### 1.2 Reuse LLM Client Instances (Singleton)

**Files**: `inference/src/providers/gemini.py`, `inference/src/providers/anthropic.py`

**Action**: Move client instantiation to module level. Create once on import, reuse across requests.

```python
# gemini.py — module top level
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# anthropic.py — module top level
client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
```

**Impact**: Eliminates TLS handshake overhead on every request. Significant under 100 concurrent users.

**Risk**: Low.

### 1.3 Fix Duplicate PrismaClient Instances

**Files**: `src/services/chatService.js` (line 4), `src/utils/llm.js` (line 6)

**Action**: Replace `const prisma = new PrismaClient()` with `import prisma from '../config/database.js'` in both files.

**Impact**: Saves DB connection pool slots (each `new PrismaClient()` opens its own pool).

**Risk**: Low.

### 1.4 Increase Uvicorn Workers

**File**: `inference/main.py` (line 21)

**Action**: Change to `uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, workers=4)` (or set via env var `INFERENCE_WORKERS`).

**Impact**: Multiple worker processes handle concurrent LLM calls in parallel. 4 workers is a good starting point for 4-8 core home server.

**Risk**: Low. Memory increases linearly but knowledge index is small.

### 1.5 Nginx: Enable Gzip + Increase Timeout

**Files**: `nginx/nginx.conf`, `nginx/conf.d/default.conf`

**Action**:
- Uncomment `gzip_types` in `nginx.conf`:
  ```
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
  ```
- Increase `proxy_read_timeout` to `120s` in `default.conf` for `/api/` location blocks

**Impact**: Prevents 504s under load. Reduces bandwidth for JSON responses.

**Risk**: Low.

### 1.6 Add Backend Container Healthcheck

**File**: `docker-compose.prod.yml`

**Action**:
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "fetch('http://localhost:8443/api/alive').then(r => { if (!r.ok) process.exit(1) })"]
  interval: 15s
  timeout: 5s
  retries: 3
```

**Impact**: Docker can detect and restart unhealthy backend containers. Essential for multi-replica setup in Phase 2.

**Risk**: Low.

---

## Phase 2: Inference Layer Scaling (3-5 days)

### 2.1 Parallelize/Optimize Knowledge Selection

**File**: `inference/src/knowledge.py`

**Action**:
- When history < 2 messages, Step 0 (summary) is already skipped — ensure Step 1 starts immediately
- Reduce `max_output_tokens` for summary to 128 (summaries are 2-4 sentences)
- Consider running summary with a faster/cheaper model

**Impact**: Shaves 1-3s off TTFR.

**Risk**: Low.

### 2.2 Concurrency Semaphore in Inference Service

**File**: `inference/src/router.py`

**Action**:
```python
import asyncio
_llm_semaphore = asyncio.Semaphore(int(os.environ.get("MAX_CONCURRENT_LLM_CALLS", "20")))

# Wrap each LLM call:
async with _llm_semaphore:
    result = await provider.generate(...)
```

**Impact**: Prevents 300 simultaneous API calls. Provides backpressure — excess requests wait instead of all failing.

**Risk**: Medium — need to tune semaphore value. Too low starves throughput; too high triggers rate limits. Start at 20.

### 2.3 Retry with Exponential Backoff

**Files**: `inference/src/providers/gemini.py`, `inference/src/providers/anthropic.py`

**Action**: Add `tenacity` library. Retry on 429/500/502/503, 3 attempts, exponential backoff from 1s. Do NOT retry on 400/auth errors.

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
```

**Dependency**: Add `tenacity` to `inference/pyproject.toml`.

**Risk**: Low.

### 2.4 Provider Fallback

**File**: `inference/src/router.py`

**Action**: If primary provider fails after retries, fall back to alternate provider. Normalize `max_tokens` between providers (Anthropic=1000 vs Gemini=8192 currently).

**Impact**: Doubles effective availability.

**Risk**: Medium — different model capabilities need normalization.

### 2.5 Scale Backend to Multiple Replicas

**File**: `docker-compose.prod.yml`

**Action**:
- Add `deploy: { replicas: 2 }` to backend service
- Remove `container_name` (forces single instance)
- Nginx upstream block:
  ```nginx
  upstream backend_pool {
      server backend-prod:8443;
  }
  ```
  Docker internal DNS round-robins across replicas.

**Impact**: Doubles Node.js event loop capacity.

**Dependency**: Phase 1.6 (healthcheck).

**Risk**: Medium — must ensure no in-memory state (currently all state is in Postgres, so this is safe).

### 2.6 Asynchronous Knowledge Selector (Pre-warmed Queue)

**Files**: `inference/src/knowledge.py`, `inference/src/router.py`, new `inference/src/knowledge_queue.py`,
`src/utils/llm.js` (Node side fetch path)

**Idea**: Today Steps 0 (summary) and 1 (knowledge selection) run **synchronously
in front of** Step 2 (the therapy reply). They add 1–4s of latency to every message
even though their inputs (recent conversation history) are already known the moment
the *previous* assistant reply completes.

Instead, run Steps 0 + 1 **eagerly in the background** the moment the previous turn
ends, and stash the result in a per-session queue keyed by `session_id`. When the
next user message arrives, Step 2 first **tries to drain** a ready knowledge result
from the queue:

- **Cache hit** → use it immediately, skip Steps 0 + 1, go straight to Step 2.
  TTFR drops by the full Step 0 + Step 1 cost (typically 1–4s).
- **Cache miss** (queue empty, e.g. first message of a session, or user typed
  faster than the background task completed) → fall back to the current synchronous
  path.

Drained entries are removed from the queue (single-shot use). Stale entries past a
TTL (e.g. 60s) are discarded so we don't serve knowledge selected against
out-of-date history.

**Sketch**:
```python
# knowledge_queue.py
from collections import defaultdict
import asyncio, time

_queues: dict[str, asyncio.Queue] = defaultdict(lambda: asyncio.Queue(maxsize=1))
TTL_SECONDS = 60

async def push(session_id: str, knowledge: str, history_hash: str):
    # Drop the queue if full (keep newest)
    q = _queues[session_id]
    if q.full():
        try: q.get_nowait()
        except asyncio.QueueEmpty: pass
    await q.put({"knowledge": knowledge, "history_hash": history_hash, "ts": time.time()})

async def try_pop(session_id: str, expected_history_hash: str) -> str | None:
    q = _queues[session_id]
    try:
        entry = q.get_nowait()
    except asyncio.QueueEmpty:
        return None
    if time.time() - entry["ts"] > TTL_SECONDS:
        return None  # discard stale
    if entry["history_hash"] != expected_history_hash:
        return None  # history changed since prefetch
    return entry["knowledge"]
```

```python
# router.py — at end of /generate after Step 2 completes
asyncio.create_task(_prefetch_next_knowledge(session_id, updated_history))
```

**Cache key / invalidation**: hash of the conversation history that *would be*
the input to Steps 0 + 1 on the next turn. If the user edits or deletes a message
between turns the hash mismatches and we fall back. Per-session `Queue(maxsize=1)`
keeps memory bounded.

**Why a queue (size 1) and not a plain dict?** Using `asyncio.Queue` makes the
producer/consumer hand-off trivially thread-safe under uvicorn's async event loop,
and lets us optionally extend to maxsize > 1 later (e.g. pre-fetch multiple
candidate knowledge bundles).

**Multi-worker caveat**: with uvicorn workers > 1 (Phase 1.4 set this to 4), the
in-memory queue is **per-process**. A user's next request may hit a different
worker → cache miss. Acceptable trade-off (fallback is the existing path), or
upgrade the queue to Redis (Phase 3.1 dependency) for cross-worker sharing.

**Impact**: Removes 1–4s from TTFR on the **second message onward** of every
session, which is the steady-state case. Combined with Phase 2.1 (smaller summary
output) and 2.2 (semaphore), eligible TTFR contribution from the selector pipeline
drops to near zero in the cache-hit path.

**Dependency**: Phase 2.1 (cleaner Step 0/1 boundaries make prefetch simpler).
Optional upgrade path: Phase 3.1 (Redis) for cross-worker sharing.

**Risk**: Medium —
- Wasted LLM calls when user abandons session right after a reply (background task
  still runs). Mitigate with a short delay before kicking off the prefetch (e.g. 2s
  after reply ends, only if user is still connected).
- Cache-key drift if other code paths can mutate session history. Mitigate via
  history hash + TTL.
- Multi-worker miss rate. Acceptable; quantify after rollout, escalate to Redis if
  hit rate is too low.

### 2.7 Knowledge Selector Statistics (Dev Observability)

**Goal**: Give developers visibility into which `.md` skills the Step 1
selector picks per message, per session — to validate selector behaviour and
to inform future decisions about prompt caching, `TOKEN_CAP` tuning, and
which knowledge bundles are "hot".

**Files**:
- `inference/src/knowledge.py` — `pick_knowledge()` returns `(body: str,
  selected_names: list[str])` instead of just `body`.
- `inference/src/router.py` — pass `selected_names` through into the
  `GenerateResponse.usage` dict (or a new top-level field).
- `inference/src/models.py` — `GenerateResponse` gains
  `selected_knowledge: list[str] | None = None`.
- `src/utils/llm.js` — `buildResponseMetadata()` extracts
  `selectedKnowledge` from the inference response and stores it under
  `Message.metadata.selectedKnowledge` (Prisma `Json?` column — **no schema
  migration needed**).
- `src/controllers/adminController.js` — `getUserChats` already returns
  `metadata` verbatim; **no backend change**.
- `test-frontend/src/views/AdminUserChatsView.vue` — two additions:
  1. **Skill Usage panel** above the Sessions list, scoped to the currently
     selected session: shows total selector invocations, total skill picks,
     and a CSS bar-chart of skill frequency (descending). Pure CSS bars
     (`width: %`) — no chart library.
  2. **Per-message badges** under each MODEL message: `Skills used:
     [cognitive-distortions] [thought-records]` rendered inline,
     **always expanded** (not nested in the existing `<details>`). Falls
     back to `(no metadata)` for pre-Phase-4 messages and to `—` for
     INITIAL-mode messages (selector skipped).

**Action**:

1. **Inference plumbing**:
   ```python
   # knowledge.py
   async def pick_knowledge(...) -> tuple[str, list[str]]:
       ...
       return "\n\n---\n\n".join(parts), [n for n in selected_names if n in name_to_entry]

   # router.py
   knowledge_context, selected_names = "", []
   if req.chatbot_type in THERAPY_MODES:
       knowledge_context, selected_names = await pick_knowledge(...)
   ...
   return GenerateResponse(
       text=result["text"],
       model=result.get("model"),
       usage=result.get("usage"),
       selected_knowledge=selected_names,   # NEW
   )
   ```
2. **Backend metadata**:
   ```js
   // llm.js — buildResponseMetadata()
   if (Array.isArray(response.selected_knowledge)) {
       meta.selectedKnowledge = response.selected_knowledge;
   }
   ```
3. **Frontend** — add a `<section class="skill-stats">` above
   `<aside class="session-pane">`, derived from `selected.value.messages`
   (Vue `computed`):
   ```js
   const skillStats = computed(() => {
       if (!selected.value) return null;
       const freq = new Map();
       let totalCalls = 0, totalPicks = 0;
       for (const m of selected.value.messages) {
           const picks = m.metadata?.selectedKnowledge;
           if (!Array.isArray(picks)) continue;
           totalCalls += 1;
           for (const name of picks) {
               freq.set(name, (freq.get(name) || 0) + 1);
               totalPicks += 1;
           }
       }
       const bars = [...freq.entries()]
           .sort((a, b) => b[1] - a[1])
           .map(([name, count]) => ({ name, count }));
       const max = bars[0]?.count || 1;
       return { totalCalls, totalPicks, bars, max };
   });
   ```

**Impact**:
- Developers can see, per session, exactly which skills were retrieved and
  how often — without grepping logs.
- Direct input for the `.plan/prompt-cache.md` decision: if the same 2–3
  bundles dominate, `TOKEN_CAP` is fine; if selection is scattered, raising
  the cap (or pre-warming a hot prefix) becomes attractive.

**Risk**: Low. Schema-free (uses existing `metadata` JSON column). Breaking
change to `pick_knowledge()` signature is contained inside the inference
service — only `router.py` calls it.

**Dependency**: Phase 2.6 is **not** required for 2.7, but they pair well:
2.6 stabilises the bundle within a session, 2.7 makes that stability
visible.

---

## Phase 3: Infrastructure (3-5 days)

### 3.1 Add Redis + Rate Limiting

**Files**: `docker-compose.prod.yml`, new `src/middleware/rateLimiter.js`

**Action**:
- Add Redis container:
  ```yaml
  redis:
    image: redis:7-alpine
    expose:
      - "6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: always
  ```
- Install `express-rate-limit` + `rate-limit-redis`
- Per-user: 10 messages/minute on chat endpoint
- Global: 200 requests/minute across all users

**Impact**: Prevents single user monopolizing inference capacity. Works across replicas.

**Dependency**: Phase 2.5 (replicas).

**Risk**: Low.

### 3.2 BullMQ Job Queue (Optional)

**Files**: New `src/queues/inferenceQueue.js`, modify `src/utils/llm.js`

**Action**:
- Enqueue inference requests as BullMQ jobs instead of direct `fetch()`
- Worker picks up jobs with concurrency limit
- Option A: Return `202 Accepted` + job ID, client polls or uses SSE
- Option B (simpler): Use BullMQ only for concurrency control, handler awaits job result

**Impact**: Backpressure + ordering + retry capability.

**Dependency**: Phase 3.1 (Redis).

**Risk**: Medium — adds complexity. Evaluate whether Phase 2.2 (semaphore) is sufficient first.

### 3.3 Remove Exposed Postgres Port in Production

**File**: `docker-compose.prod.yml` (line 79)

**Action**: Remove or comment out the `ports` mapping for Postgres.

**Impact**: Security fix. Internal Docker networking unaffected.

**Risk**: Low.

### 3.4 Prisma Connection Pool Tuning

**File**: `prisma/schema.prisma` or `DATABASE_URL` env var

**Action**: Add pool parameters:
```
postgresql://user:pass@postgres:5432/db?schema=public&connection_limit=20&pool_timeout=10
```

With 2 backend replicas × pool of 10 = 20 total, within Postgres default max (100).

**Impact**: Prevents DB connection exhaustion under load.

**Dependency**: Phase 2.5 (replicas).

**Risk**: Low.

---

## Phase 4: Advanced Optimizations (3-5 days, evaluate need first)

### 4.1 Cache Knowledge Selection Results

**File**: `inference/src/knowledge.py`

**Action**:
- Cache conversation summary keyed by `session_id + last_message_timestamp` (LRU, 5min TTL)
- Cache knowledge file selection keyed by `chatbot_type + summary_hash`
- Use Python `cachetools` for in-memory LRU, or Redis for cross-worker caching

**Impact**: Eliminates 1-2 LLM calls for repeat/similar conversations. Estimated 30-50% cache hit rate for returning users.

**Risk**: Low — stale cache is acceptable for knowledge selection.

### 4.2 Smart History Truncation

**File**: `src/utils/llm.js`

**Action**:
- Approximate token count: `content.length / 4`
- Cap at ~4000 tokens of history (configurable)
- Keep first 2 messages (session opening) + most recent N that fit
- Optional: summarize old history into a stored "session summary" message

**Impact**: Reduces input tokens → faster LLM response + lower API cost.

**Risk**: Medium — overly aggressive truncation loses therapeutic context. "Keep first + recent" strategy mitigates.

### 4.3 Prometheus + Grafana Metrics

**Files**: New `src/middleware/metrics.js`, `inference/main.py`

**Action**:
- Add `prom-client` to Node.js backend
- Track: request latency, active connections, inference duration, error rate
- Add `/metrics` endpoint (internal only)
- Add `prometheus-fastapi-instrumentator` to inference
- Optional: Prometheus + Grafana containers

**Impact**: Can't optimize what you can't measure.

**Risk**: Low — observability only.

### 4.4 WebSocket for Real-Time Chat

**Files**: `src/app.js`, new `src/ws/chatHandler.js`

**Action**:
- Replace HTTP request-response with persistent WebSocket per chat session
- Use `ws` or `socket.io`
- Nginx already has WebSocket upgrade headers configured

**Impact**: More efficient than SSE for bidirectional communication. Reduces connection overhead.

**Dependency**: Phase 1.1 (streaming must work first).

**Risk**: Medium — requires client-side changes, reconnection logic, auth over WebSocket.

---

## Recommended Implementation Order

**Start here — maximum impact, minimum effort:**

1. Phase 1.2 — Client reuse (30 min)
2. Phase 1.3 — Fix PrismaClient (15 min)
3. Phase 1.4 — Uvicorn workers (5 min)
4. Phase 1.5 — Nginx config (15 min)
5. **SSE streaming — see `.plan/sse-message-streaming.md` (separate plan, multi-PR)**

**Then iterate:**

6. Phase 2.2 — Concurrency semaphore
7. Phase 2.3 — Retry logic
8. Phase 2.1 — Optimize knowledge selection
9. Phase 2.4 — Provider fallback
10. Phase 2.6 — Asynchronous knowledge selector (pre-warmed queue)
11. Phase 2.7 — Knowledge selector statistics (dev observability)
12. **Anthropic prompt caching — see `.plan/prompt-cache.md` (separate plan)** — gated on data from Phase 2.7

**Then scale:**

10. Phase 1.6 + 2.5 — Healthcheck + backend replicas
11. Phase 3.1 — Redis + rate limiting
12. Phase 3.3 — Remove exposed Postgres port
13. Phase 3.4 — Connection pool tuning

**Evaluate need for:**

14. Phase 3.2 (BullMQ) — only if semaphore is insufficient
15. Phase 4.x — based on metrics from Phase 4.3

---

## New Dependencies

| Item | Phase | Type | Notes |
|------|-------|------|-------|
| `tenacity` (pip) | 2.3 | pip package | Retry library |
| Redis 7 container | 3.1 | Docker container | ~30MB RAM |
| `express-rate-limit` + `rate-limit-redis` | 3.1 | npm packages | Rate limiting |
| `bullmq` (npm) | 3.2 | npm package | Optional job queue |
| `prom-client` (npm) | 4.3 | npm package | Prometheus metrics |
| `prometheus-fastapi-instrumentator` (pip) | 4.3 | pip package | FastAPI metrics |
| `ws` or `socket.io` (npm) | 4.4 | npm package | Optional WebSocket |

---

## Success Criteria

- [ ] TTFR under 3 seconds (streaming) — currently 5-15+ seconds
- [ ] 100 concurrent chat sessions without 5xx errors
- [ ] No 429 errors from LLM providers under normal load
- [ ] P95 end-to-end latency under 20 seconds for complete response
- [ ] Zero exposed database ports in production
- [ ] Per-user rate limiting prevents single-user monopolization
- [ ] Graceful degradation under overload (queued, not dropped)

---

## Key Files Referenced

- `src/utils/llm.js` — Core LLM orchestration (biggest bottleneck source)
- `inference/src/router.py` — Inference endpoint
- `inference/src/knowledge.py` — Knowledge selection (2 LLM calls)
- `inference/src/providers/gemini.py` — Gemini client
- `inference/src/providers/anthropic.py` — Anthropic client
- `inference/main.py` — Uvicorn launch config
- `src/services/chatService.js` — Chat service
- `src/config/database.js` — Prisma singleton
- `docker-compose.prod.yml` — Production deployment
- `nginx/conf.d/default.conf` — Nginx proxy config
- `nginx/nginx.conf` — Nginx main config
