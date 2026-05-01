# Plan — Monitoring, Logs, and Admin Data Visualization

**Date:** 2026-05-01 (v3 — Option B + env-allowlist auth, all open questions resolved)
**Branch (proposed):** `chore/monitor-logs-and-admin-dashboard`
**Status:** PLAN ONLY — do not execute until Mulkooo approves
**Supersedes:** previous draft `.plan/monitor-and-logs.md` (lost when `.plan/` was untracked)

---

## 0. Goal

Three deliverables, one branch / one PR:

1. **Discord webhook alerting** — outbound POSTs from prod backend to a Discord Incoming Webhook on warn/error.
2. **Mounted, rotated container logs** — prod backend stdout/stderr captured to `./logs/backend-prod/` on the host with **daily rotation, 7-day retention** — using **Docker's built-in capabilities + a small entrypoint tee**, no in-app logging library.
3. **Admin data dashboard** on the existing `test-frontend/` Vue app — three views over prod data: registered user list, LLM service stats (token usage, active time per user, etc.), per-user chat histories.

Testing-stage assumption (provided by Mulkooo): every prod user is **hand-picked by the team and has consented to analysis**, so PII access from the dashboard is acceptable for the team. We still gate the admin endpoints behind a role check (defense in depth).

---

## 1. Current Context & Assumptions

### Repo / branch state
- `main` is clean as of 2026-05-01. `.plan/` exists but was never committed.
- AGENTS.md hard rules apply: never touch `main`, only `docker-compose.test.yml` may be brought up by the agent, all work on a feature branch with PR.

### Backend
- Node 20 / Express 5 / Prisma 6, plain HTTP via `app.listen()` on `PROD_PORT` (default 8443) — TLS terminated by nginx upstream.
- Auth: `src/middleware/auth.js` (JWT). **No role/admin field on `User` today.**
- LLM call site: `src/utils/llm.js`. Token usage is **not currently persisted**. `Message.metadata` is `Json?`, available for use.

### DB models touched by the dashboard
- `User`, `ChatSession` (sessionId, chatbotType, provider, createdAt), `Message` (messageType, chatbotType, provider, content, **metadata Json?**, timestamp).

### Test frontend
- `test-frontend/` — Vue 3 + Vite + Pinia + vue-router. Existing views: Login, ChatLayout, ChatConversation, NewSession, SessionList. We extend it.

### What's NOT in scope
- Postgres / inference / dev container log mounting — deferred (Mulkooo's spec was prod backend only).
- Postgres FATAL → Discord — deferred.
- ELK/Loki pipeline — not on the immediate roadmap, so Docker-native logging is sufficient (see Option-B discussion in the conversation thread).

---

## 2. Approach (Option B — Docker-native logs + small app-side Discord alerter)

```
┌────────────────────────────────────────────────────────────────────┐
│ prod backend container (mindecho_backend_prod)                     │
│                                                                    │
│  node src/server.js                                                │
│      │                                                             │
│      ├─ stdout/stderr  ──tee──► /app/logs/backend-prod-YYYY-MM-DD  │
│      │                          .log  (mounted to ./logs/...)      │
│      │                          rotated daily by entrypoint,       │
│      │                          7-day retention by cleanup script  │
│      │                                                             │
│      └─ src/utils/alert.js (called from error middleware +         │
│         unhandledRejection + uncaughtException) ──HTTP POST──►     │
│                                                  Discord Webhook   │
│             ├─ prod-only (NODE_ENV + DISCORD_ALERT_WEBHOOK_URL)    │
│             ├─ severity = warn|error                               │
│             ├─ 60 s dedupe ("↺ repeated N×" follow-up)             │
│             ├─ 2 s min interval throttle                           │
│             ├─ 50-msg / minute overflow cap                        │
│             └─ honors HTTP 429 Retry-After                         │
│                                                                    │
│  GET /api/admin/*  (NEW, role=ADMIN required)                      │
│    ├─ /users            → user list + agg stats                    │
│    ├─ /llm-stats        → token usage, active time, per-user agg   │
│    └─ /users/:id/chats  → sessions + messages for one user         │
└────────────────────────────────────────────────────────────────────┘
                          ▲
                          │  fetch (Bearer JWT, role=ADMIN)
                          │
┌────────────────────────────────────────────────────────────────────┐
│ test-frontend (Vue 3) — NEW routes under /admin/*                  │
│   /admin/users      ← AdminUsersView.vue                           │
│   /admin/llm        ← AdminLlmStatsView.vue                        │
│   /admin/users/:id  ← AdminUserChatsView.vue                       │
└────────────────────────────────────────────────────────────────────┘
```

### Why no pino / Logstash
- Pino: nice but solves "structured JSON logging" — we don't have an ELK/Loki sink, so the structure is wasted.
- Logstash: ingests/transforms logs *after* they're produced; not a logger, not what we need.
- Docker's `json-file` driver already rotates by size+count for free; combined with a stdout `tee` we get a human-readable file under `./logs/` AND `docker logs` keeps working.

---

## 3. Step-by-Step Plan

### Phase 0 — Branch + scaffolding
1. `git checkout main && git pull`
2. `git checkout -b chore/monitor-logs-and-admin-dashboard`
3. Create `logs/.gitignore` containing `*` and `!.gitignore` so the dir exists in git but its contents are ignored.

### Phase 1 — Logging (Docker-native, prod backend only)

**Files to add / change:**
- `scripts/entrypoint-prod.sh` (NEW) — wraps the existing CMD. Uses a small Node helper that owns the file handle so we get **proper midnight rotation** without needing a container restart:
  ```sh
  #!/bin/sh
  set -e
  export LOG_DIR="${LOG_DIR:-/app/logs}"
  mkdir -p "$LOG_DIR"
  # Pipe app stdout+stderr through the rotator (which writes to dated files
  # AND echoes to its own stdout, so `docker logs` keeps working).
  exec node src/server.js 2>&1 | node scripts/log-rotator.js
  ```
- `scripts/log-rotator.js` (NEW) — ~40 lines, no deps:
  - Reads `LOG_DIR` env, opens `backend-prod-<UTC-date>.log` for append.
  - On every newline of stdin: write to current file AND `process.stdout.write` (so Docker still captures).
  - `setInterval(checkDateRollover, 30_000)`: when the UTC date changes, `fs.close` the old handle, open the new dated file, `fs.symlinkSync(newName, LOG_DIR/current.log)` (force-replace), and run a 7-day cleanup: `fs.readdir` → drop any `backend-prod-*.log` whose date is older than 7 days.
  - Handles SIGTERM/SIGINT cleanly: flush, close, exit 0.
- `Dockerfile` (prod stage) → `COPY scripts/entrypoint-prod.sh scripts/log-rotator.js /app/scripts/`, `chmod +x` the entrypoint, `ENTRYPOINT ["/app/scripts/entrypoint-prod.sh"]`.

**Test plan (Phase 1):**
- Smoke test under `docker-compose.test.yml`: bring up backend, hit a few endpoints, verify `./logs/backend-prod/backend-prod-YYYY-MM-DD.log` exists with the request lines and `current.log` symlink resolves.

### Phase 2 — Discord alerter (small app-side helper)

**Files to add / change:**
- `src/utils/alert.js` (NEW) — `discordAlert({ level, message, error, context })`:
  - No-op when `NODE_ENV !== 'production'` OR `!process.env.DISCORD_ALERT_WEBHOOK_URL`.
  - Maintains an in-memory map: `fingerprint → { count, firstSeenAt }`.
    - Fingerprint = sha1(`level | message | error?.code | error?.name`).
    - On first occurrence in 60 s → POST immediately.
    - Repeat occurrences → suppressed; at end of window POST single follow-up `↺ repeated N×`.
  - Throttle: min 2 s between sends; queue up to 50 msgs/min; on overflow drop with one-time `⚠ alert overflow, dropping` notice.
  - Respects HTTP `429` `Retry-After` (sleep, then resume).
  - Embed: title = level emoji + UPPERCASE level, description = message (4000-char trim), fields = container hostname, ISO timestamp, optional `context` keys.
- `src/middleware/errorHandler.js` (NEW or extend existing) — catches Express errors, calls `console.error` (so it lands in the tee'd file) AND `discordAlert({ level: 'error', ... })` for 5xx.
- `src/server.js` — register `process.on('unhandledRejection')` and `process.on('uncaughtException')` → `discordAlert({ level: 'error', ... })`, then re-throw / exit per current Node best practice.

**Test plan (Phase 2):**
- `tests/unit/utils/alert.test.js` — mock `fetch`; assert:
  - dev mode: zero calls
  - prod mode: first call sent, dedupe window suppresses repeats, follow-up `↺ repeated N×` fires
  - throttle: rapid bursts → spaced ≥ 2 s
  - overflow: > 50/min → drop + one-shot overflow notice
  - 429 with `Retry-After: 3` → next send delayed ≥ 3 s
- **Must not hit the real webhook** (use a mock URL + `fetch` stub).

### Phase 3 — Compose wiring (prod only)

**Files to change:**
- `docker-compose.prod.yml`:
  ```yaml
  backend:
    volumes:
      - ./logs/backend-prod:/app/logs
    environment:
      LOG_DIR: /app/logs
      DISCORD_ALERT_WEBHOOK_URL: ${DISCORD_ALERT_WEBHOOK_URL:-}
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "7"
  ```
- `.env.sample` → document `DISCORD_ALERT_WEBHOOK_URL=` (blank).
- `README.md` → short "Operational logs & alerting" section.

**Verification (Phase 3):**
- Cannot be run by the agent (AGENTS.md forbids `up` against prod compose). Mulkooo to verify by:
  1. `docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend`
  2. Confirm `./logs/backend-prod/backend-prod-YYYY-MM-DD.log` appears
  3. Trigger a 5xx → confirm Discord embed lands

### Phase 4 — Token usage capture (prerequisite for the LLM-stats dashboard)

**Files to change:**
- `src/utils/llm.js` — when persisting the model response `Message`, fill `metadata`:
  ```json
  { "tokens": { "input": N, "output": N, "total": N },
    "model": "<provider-model-name>",
    "latencyMs": N }
  ```
  Pull from `usageMetadata` (Gemini) / `usage` (Anthropic). If absent, store `null` — never crash.
- No schema migration; `Message.metadata` is already `Json?`.

**Test plan (Phase 4):**
- Unit-test the metadata-extraction helper for both providers (mock provider responses).
- No backfill of historical messages — dashboard shows "n/a" for older rows. (Open question Q3.)

### Phase 5 — Admin auth + admin API

**No schema migration.** Auth uses an env-based username allowlist, since the `test-frontend/` is dev-team-only by design and Mulkooo hand-curates accounts directly in the DB.

**Files to add:**
- `src/middleware/requireAdmin.js` (NEW) — runs after `authenticate`:
  ```js
  const ADMIN_SET = new Set(
    (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  export const requireAdmin = (req, res, next) =>
    ADMIN_SET.has(req.user?.userId)
      ? next()
      : res.status(403).json({ message: 'Forbidden — admin only' });
  ```
  - Uses `req.user.userId` (the `User.userId` field, e.g. `prof_peiyu`), populated by the existing `authenticate` middleware.
  - Empty allowlist → all requests 403 (safe default if env is missing).
- `src/controllers/adminController.js` (NEW) — three handlers:
  - `listUsers` — id, userId, email, name, isActive, lastLoginAt, createdAt, dataAnalysisConsent, plus aggregates: `messageCount`, `sessionCount`, `lastMessageAt`.
  - `llmStats` — global + per-user: total input/output/total tokens, request count, by `chatbotType`, by `provider`, by day (last 30 d). **"Weekly active time" per user** = sum across the 7 weekdays of `(last_message_ts_that_day - first_message_ts_that_day)`, computed over the last 30 d (or "current ISO week" — confirm with Mulkooo at impl time; defaulting to current ISO week as the more natural reading of "weekly").
  - `getUserChats` — `:userId`, sessions ordered by `updatedAt desc` with paginated messages (page size 50).
- `src/routes/admin.js` (NEW) — `GET /api/admin/users`, `/api/admin/llm-stats`, `/api/admin/users/:userId/chats`. Mount in `src/routes/main.js` behind `authenticate, requireAdmin`.

**Env config:**
- `ADMIN_USERNAMES=prof_peiyu,prof_zhixun,prof_peihsuan,yuming,jinghan,yishin,yuchen` — set in prod `.env` only. Documented in `.env.sample` as blank (don't commit real names).

**Test plan (Phase 5):**
- `tests/integration/admin.test.js` — set `ADMIN_USERNAMES=alice` for the test, seed two users (alice + bob), assert:
  - bob (non-admin) → 403 on every `/api/admin/*`
  - alice (admin) → 200, response shape matches contract
  - llmStats sums match seeded fixtures
  - empty `ADMIN_USERNAMES` → everyone 403

### Phase 6 — Test-frontend admin views

**Files to add:**
- `test-frontend/src/views/AdminUsersView.vue` — sortable table (name / email / lastLoginAt / sessions / messages / lastMessageAt / consent / active). Click row → `/admin/users/:id`.
- `test-frontend/src/views/AdminLlmStatsView.vue` — KPI cards (total tokens 30 d, total requests 30 d, active users 30 d) + per-user table + tiny inline-SVG sparkline (no chart lib).
- `test-frontend/src/views/AdminUserChatsView.vue` — left pane: session list; right pane: message thread; collapsible metadata row under each MODEL message.
- `test-frontend/src/api/admin.js` — fetch wrapper using existing auth store's bearer token.
- `test-frontend/src/router/index.js` — add three routes; reuse existing auth guard. The Admin nav link is **always shown** (test-frontend is dev-only); if the JWT isn't in the allowlist, the API returns 403 and the view shows a friendly "Not in admin allowlist" message.
- `test-frontend/src/views/ChatLayout.vue` (or wherever the nav lives) — add static "Admin" link.

**Styling:** plain CSS in `test-frontend/src/styles/admin.css`. No new npm deps in the frontend.

**Test plan (Phase 6):**
- Manual smoke test via `vite preview` against `docker-compose.test.yml` seeded with admin + sample data.
- Add `scripts/seed-admin-fixture.js` for the seed.

### Phase 7 — Open PR
- Push branch, open PR titled `chore: container logs, Discord alerting, and admin data dashboard`.
- PR body: three deliverables, the Phase 3 manual verification steps, deferred items.

---

## 4. Files Likely to Change / Add

| Path | Change |
|---|---|
| `scripts/entrypoint-prod.sh` | NEW |
| `scripts/log-rotator.js` | NEW (~40 lines, no deps; midnight rotation + 7-day cleanup) |
| `Dockerfile` (prod stage) | use new entrypoint |
| `src/utils/alert.js` | NEW |
| `src/middleware/errorHandler.js` | NEW or extend |
| `src/utils/llm.js` | metadata capture (tokens, model, latency) |
| `src/server.js` | unhandled handlers + alerter wiring |
| `src/middleware/requireAdmin.js` | NEW (env-allowlist) |
| `src/controllers/adminController.js` | NEW |
| `src/routes/admin.js` | NEW |
| `src/routes/main.js` | wire admin routes |
| `docker-compose.prod.yml` | bind mount + json-file driver + env |
| `.env.sample`, `README.md` | docs (`ADMIN_USERNAMES`, `DISCORD_ALERT_WEBHOOK_URL`, `LOG_DIR`) |
| `logs/.gitignore` | NEW |
| `tests/unit/utils/alert.test.js` | NEW |
| `tests/integration/admin.test.js` | NEW |
| `test-frontend/src/views/Admin*.vue` (×3) | NEW |
| `test-frontend/src/api/admin.js` | NEW |
| `test-frontend/src/router/index.js` | + admin routes |
| `test-frontend/src/styles/admin.css` | NEW |

**Notably NOT changed** (vs v2 of this plan): no Prisma migration, no `User.role`, no `scripts/seed-admin-fixture.js`, no `scripts/promote-admin.js`. Admin membership is pure env config.

---

## 5. Tests / Validation

- `npm test` — unit tests above must pass.
- `npm run test:integration` under `docker-compose.test.yml` for the admin endpoints + log-file smoke test.
- Manual (Mulkooo): bring up prod backend, confirm `./logs/backend-prod/backend-prod-YYYY-MM-DD.log` appears + rotates, trigger 5xx → Discord embed arrives.
- Manual (Mulkooo): hit `/admin/users` in the browser as the seeded admin, confirm tables render and per-user chat history loads.

---

## 6. Risks, Tradeoffs, Open Questions

**Risks**
- **PII surface area.** Even with consent, the dashboard centralizes raw chat content. Mitigations: role gate, JWT-only access, no public route, read-only.
- **Discord alert storms.** Mitigated by dedupe + throttle + overflow cap; watch first week.
- **Log disk usage.** Tee'd file capped by the 7-day cleanup (~50 MB/day soft expectation = ~350 MB max). Docker's `json-file` driver (`max-size 50m, max-file 7`) is an independent safety net for stdout capture.
- **Rotator process death.** If `scripts/log-rotator.js` crashes, the pipeline `node src/server.js | node log-rotator.js` exits, container exits, Docker restarts it. So a rotator bug becomes "container restart loop" not "silent log loss" — preferable failure mode. We'll add a `try/catch` around the rotator's date-check `setInterval` to avoid this.

**Resolved decisions (from planning convo)**
1. **Daily rotation:** in-process Node midnight rotator (`scripts/log-rotator.js`) — no container restart needed.
2. **Alert threshold:** `warn` AND `error` both POST to Discord.
3. **Token backfill:** old messages show "n/a"; no backfill, no re-asking providers.
4. **Weekly active time per user:** sum across the 7 weekdays of `(last_msg_ts_that_day − first_msg_ts_that_day)`. Default scope = current ISO week; coder agent should make the time window configurable via query param if trivial.
5. **Admin auth:** env allowlist `ADMIN_USERNAMES` (no Prisma migration, no `User.role` column, no seed script). Mulkooo will set:
   ```
   ADMIN_USERNAMES=prof_peiyu,prof_zhixun,prof_peihsuan,yuming,jinghan,yishin,yuchen
   ```
6. **Discord webhook URL:** Mulkooo will create the Incoming Webhook and set `DISCORD_ALERT_WEBHOOK_URL` in prod `.env` after the PR is reviewed. Agent never sees the secret.

---

## 7. Out of Scope (deferred)

- Postgres prod container log mounting.
- Dev / inference container logs.
- Postgres FATAL → Discord.
- Real charts library (Chart.js / ECharts).
- Audit log of admin views (who looked at whose chats and when).
- ELK/Loki pipeline (would warrant pino + Filebeat at that point).
