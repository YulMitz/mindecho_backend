# Implementation Plan: Anthropic Prompt Caching for Step 2

> **Status:** Proposal — pending decision to implement.
> **Owner branch (suggested):** `feat/anthropic-prompt-cache`
> **Related plan:** `.plan/scaling-plan-100-concurrent-users.md` (Phase 2.6 prefetch queue)

---

## 1. Background

Anthropic exposes [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
that lets us mark a **prefix** of a request as cacheable. On a cache hit the
server skips re-encoding that prefix and bills it at **0.10×** input price
(reads) instead of 1×. Cache writes cost **1.25×** input price. Default TTL is
5 minutes (sliding — every hit refreshes it); a 1h TTL exists at 2× write cost.

Mind Echo's Step 2 (therapy response) is the only call where caching can pay
off. Step 0 (summary) and Step 1 (knowledge selector) are short prompts that
will never reach the **4,096-token minimum prefix length** required by
`claude-haiku-4-5-20251001` (our `SELECTION_MODEL_ANTHROPIC` and Step 2 model).

The single largest stable prefix in Step 2 is the system prompt + (when
selected) the knowledge bundle. Conversation history is volatile and grows
every turn → it must stay outside the cached region.

## 2. Goals

- **Reduce Step 2 input cost** by ~85% on cache hits for the cached portion.
- **Reduce Step 2 latency** modestly (server skips prefix encoding).
- **Zero functional change** — same model output, same conversation flow.
- **Anthropic provider only** for this iteration (Gemini context cache is a
  different API, deferred).

## 3. Non-Goals

- Padding short prompts up to 4,096 tokens to force cache eligibility (always
  net-negative — see §10 Pitfalls).
- Caching Step 0 / Step 1 selector calls (prefixes too short).
- Caching Gemini calls (different API, separate plan if/when needed).
- A "hot knowledge bundle" pre-warmed prefix pool (deferred — revisit after
  metrics from this plan land).

## 4. Where the Cache Boundary Goes

Anthropic's cache hierarchy is `tools → system → messages`. The **breakpoint
must be placed at the end of a static block**; everything *after* the
breakpoint is not cached, and any change before it invalidates the cache.

Today (`inference/src/router.py`):

```python
system_prompt = get_system_prompt(req.chatbot_type, req.prompt_options)
if knowledge_context:
    system_prompt = f"{system_prompt}\n\n**Reference Knowledge**\n…\n{knowledge_context}"
result = await providers.anthropic.generate(system_prompt, history, req.message)
```

After this change:

```python
# router.py
system_blocks = [{"type": "text", "text": get_system_prompt(...)}]
if knowledge_context:
    system_blocks.append({
        "type": "text",
        "text": f"**Reference Knowledge**\n…\n{knowledge_context}",
        "cache_control": {"type": "ephemeral"},   # ← breakpoint here
    })
else:
    # No knowledge → cache the system prompt alone (only if ≥4,096 tokens;
    # currently ALL system prompts are <4,096 tokens, so this branch is a
    # no-op cache miss. Logged + tracked, no padding workaround.)
    system_blocks[0]["cache_control"] = {"type": "ephemeral"}

result = await providers.anthropic.generate(
    system=system_blocks,                 # was a string
    history=history,
    user_message=req.message,
)
```

The `messages=` array (history + new user turn) stays uncached.

### Why this boundary

1. **System + knowledge is the only stable, large prefix** within a session.
2. **History changes every turn** → caching it gives zero hits.
3. **Knowledge bundle stability** is exactly what Phase 2.6 (pre-warmed queue)
   already guarantees within a session window. 2.6 + 2.7 are natural pair.

## 5. File-by-File Changes

| File | Change |
|---|---|
| `inference/src/providers/anthropic.py` | `generate()` signature: `system` accepts `str` *or* `list[dict]`. When list, pass through to `messages.create(system=…)`. Read `usage.cache_creation_input_tokens` + `usage.cache_read_input_tokens` from response, include in returned `usage` dict. |
| `inference/src/router.py` | Build `system_blocks` list as shown in §4. Pass list to `providers.anthropic.generate(...)`. Gemini path keeps current string form (no API change for Gemini). |
| `inference/src/models.py` | Already returns `usage: dict[str, Any] \| None` — no schema change; new keys flow through transparently. |
| `src/utils/llm.js` (`buildResponseMetadata`) | Extract `cache_creation_input_tokens` + `cache_read_input_tokens` from `usage`, store under `metadata.cache = { write, read }`. Backwards-compatible (null when absent). |
| `src/controllers/adminController.js` (`llmStats`) | Optional follow-up: aggregate `cache.read` / `cache.write` across messages and surface in `byChatbotType` rows. **Out of scope for first PR.** |

## 6. Estimated Impact

Per `inference/src/prompts.py`:
- INITIAL system prompt ≈ **1,443 tokens** → never cacheable (too short, and
  INITIAL skips knowledge entirely).
- CBT/MBT/MBCT/DBT system prompts ≈ **380–680 tokens**.
- Knowledge bundle ≈ **500 tokens** (`TOKEN_CAP=2000` with selector typically
  picking 2–3 files).
- Combined system+knowledge ≈ **900–1,200 tokens** → **still under 4,096**.

**Conclusion:** with current prompt sizes and `TOKEN_CAP=2000`, **first-PR cache
hit rate ≈ 0%**. To make caching effective we must either:

1. **Raise `TOKEN_CAP`** so combined prefix exceeds 4,096 tokens (gives the
   model more reference material, costs more *input* tokens but cached at 0.1×
   on hits), **or**
2. **Switch to Sonnet** which has a lower 1,024-token min prefix (overkill for
   Mind Echo's traffic — defer).

Recommended path (write into plan, not first PR): **measure actual prompt
sizes in production first** via the new selector stats UI (see Phase 2.7 in
scaling plan), then decide whether to raise `TOKEN_CAP` to ~4,000 or fold
mode-specific common preamble into the system prompt to push it past the
4,096 floor.

## 7. Implementation Steps

1. **Branch** `feat/anthropic-prompt-cache` off latest `dev`.
2. **Wire usage fields through** — extend `inference/src/providers/anthropic.py`
   `generate()` to read `cache_creation_input_tokens` / `cache_read_input_tokens`
   from `response.usage` and merge into the returned `usage` dict. No prompt
   changes yet — verify the keys appear in `Message.metadata` end-to-end.
3. **Convert system to list-of-blocks** in `router.py` + provider. Add
   `cache_control` only when `knowledge_context` is non-empty AND combined
   length exceeds the 4,096-token threshold (use `len(text) // 4` heuristic
   matching `knowledge.py`'s `CHARS_PER_TOKEN`).
4. **Add a feature flag** `ANTHROPIC_PROMPT_CACHE_ENABLED` (env, default
   `false`) so we can A/B in production by toggling without redeploy.
5. **Surface metrics** — log `cache.read` / `cache.write` per request at INFO.
6. **Tests** — vitest for `buildResponseMetadata` cache extraction; pytest for
   `router.py` system_blocks shape (snapshot test).
7. **Verify in dev** — run a 10-turn CBT session, confirm cache_read > 0 from
   turn 2 onwards (only if combined prefix ≥ 4,096 tokens; otherwise expect 0
   and that's the trigger for §6 follow-up).

## 8. Verification

- `npm test` (vitest) — `buildResponseMetadata` extracts new fields.
- `cd inference && PYTHONPATH=… python -m pytest -q` — provider list/string
  shape branches both work.
- `node --check src/utils/llm.js` and `python3 -m py_compile inference/src/*.py`
  before commit.
- Manual: run `docker compose -f docker-compose.test.yml up`, send 5 turns to a
  CBT session via test-frontend, open AdminUserChatsView for that user, expand
  metadata on each MODEL message → confirm `cache.read` increments.

## 9. Rollout

1. Ship behind `ANTHROPIC_PROMPT_CACHE_ENABLED=false` (default off).
2. Enable in staging, watch latency + cost per request for 24h.
3. Enable in prod for 10% of traffic via Anthropic-only requests (Gemini path
   unaffected).
4. If cache hit rate < 20% after 48h, follow §6 recommendation to raise
   `TOKEN_CAP` and re-measure.
5. Full rollout once hit rate ≥ 50% on Anthropic traffic.

## 10. Pitfalls

- **DO NOT pad prompts to 4,096 tokens.** Padding pays 1.25× write + 0.10× read
  on the padding bytes forever — strictly worse than no cache. Either the
  natural prefix exceeds the floor or we don't cache.
- **Breakpoint placement matters.** Put `cache_control` on a *block whose
  content is stable across requests within a session*. Putting it on a block
  containing the latest user message = zero hits.
- **Cache invalidation cascade.** Any byte change in tools/system/messages
  *before* the breakpoint invalidates everything from that point on. Do not
  interpolate timestamps, request IDs, or `now()` into the system prompt.
- **5min TTL.** Idle users beyond 5 minutes get cache misses. This is fine for
  active sessions; do not chase 1h TTL (2× write) without metrics.
- **Multi-worker miss rate.** Anthropic's cache is server-side global per
  account, so multiple uvicorn workers / backend replicas all benefit — no
  cross-worker coordination needed.
- **`prompts.py` template variables.** `get_system_prompt(chatbot_type,
  prompt_options)` interpolates `prompt_options`. If those values vary per
  user/session (e.g. user name), the cached prefix is per-(mode, options)
  combo, not per-mode. Audit `prompt_options` callers before turning cache on.
- **Gemini path untouched.** The router branches on `req.provider`. Until
  Gemini context-cache work lands separately, the Gemini call uses the
  string-form system prompt as today.

## 11. Open Questions

1. **Raise `TOKEN_CAP` to ~4,000?** Decision deferred to after Phase 2.7
   (selector stats UI) gives us real data on selector behaviour and prompt
   sizes in production.
2. **1h TTL worth it?** Only if metrics show >25% of sessions span the 5-min
   window with steady traffic. Defer.
3. **Hot knowledge bundle pre-warmed prefix pool?** A future Phase 4.5 idea —
   periodically issue a tiny dummy request keyed on top-N knowledge bundles to
   keep their cache warm across all users. Not in scope here.
