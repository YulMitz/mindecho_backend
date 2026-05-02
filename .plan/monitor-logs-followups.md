# Plan — monitor-and-logs Follow-ups

**Date:** 2026-05-02
**Supersedes:** none (follow-up to `.plan/monitor-and-logs.md`, merged in PR #17 / #18)
**Status:** PLAN ONLY — coder agent executes after Mulkooo's go-ahead
**Branches (proposed):** **two PRs**
- PR-A: `chore/admin-hardening` (Phase 1 + Phase 2)
- PR-B: `feat/admin-chats-cursor-and-active-window` (Phase 3 + Phase 4)

> **For coder agent:** Use `subagent-driven-development` skill to implement PR-A first, get it merged, then start PR-B from the freshly pulled `main`. Do **NOT** combine the two PRs.

---

## 0. Goal

Address the post-merge follow-ups raised by the previous coder agent on the
`monitor-and-logs` deliverable:

| # | Item | Phase | PR |
|---|---|---|---|
| 1 | 4xx **server-side-unexpected** → Discord alert | 1 | A |
| 2 | Admin endpoints rate limit | 2 | A |
| 3 | `/api/admin/users/:userId/chats` cursor pagination | 3 | B |
| 4 | `weeklyActiveTimeSec` → session-window heuristic (5 min idle gap) | 4 | B |

Two **explicitly deferred** items (do **NOT** implement, just leave a TODO + open
issue):
- MainLayout role-based admin-card gate — defer until non-admin users exist.
- Frontend-reported `clientActiveMs` for "real" active time — next iteration after this plan.

---

## 1. Current Context

- Branch off `main` (always pull first per AGENTS.md Rule 1).
- `src/utils/alert.js` already implements dedupe / throttle / 60s window /
  Retry-After / overflow cap. `discordAlert({ level, message, error, context })`
  is no-op in non-prod.
- `src/middleware/errorHandler.js` already calls `discordAlert` for status ≥ 500.
  4xx is currently silent.
- `src/routes/admin.js` mounts `authenticate, requireAdmin` then three GETs:
  `/users`, `/llm-stats`, `/users/:userId/chats`. **No rate limit.**
- `src/controllers/adminController.js`:
  - `getUserChats` uses `skip: (page-1)*pageSize, take: pageSize` (offset paging) — line 287-288.
  - `weeklyActiveTimeSec` (lines 210-218) computes per-day `(max - min)/1000` over Taipei-week messages — the "8-hour idle" bug the previous agent flagged.
- No `express-rate-limit` dependency yet.
- Tests: `tests/integration/admin.integration.test.js` exists; vitest 2.1; integration runner = `npm run test:integration`.

---

## 2. PR-A — `chore/admin-hardening`

### Phase 0 — Branch
1. `git checkout main && git pull`
2. `git checkout -b chore/admin-hardening`

### Phase 1 — 4xx "server-side-unexpected" Discord alert

**Definition of "server-side-unexpected 4xx":** a 4xx where the route's own code
called `next(err)` with an `err.status` in [400, 499] **AND** the status is one
of `{408, 409, 422, 425, 429, 451}` OR `err.expose !== true` (i.e. not a
client-input-validation error). Pure 400/401/403/404/415 caused by client input
should NOT page Discord — too noisy.

**Files to change:**
- `src/middleware/errorHandler.js` — add a `shouldAlert4xx(err, status)` helper:
  ```js
  const QUIET_4XX = new Set([400, 401, 403, 404, 405, 415]);
  const NOISY_4XX = new Set([408, 409, 422, 425, 429, 451]);

  const shouldAlert4xx = (err, status) => {
      if (status < 400 || status >= 500) return false;
      if (NOISY_4XX.has(status)) return true;
      // err.expose === true means express marked it as a "safe to show client"
      // validation/auth error — i.e. expected. Anything else with a 4xx is
      // probably the server confused.
      return err?.expose !== true && !QUIET_4XX.has(status);
  };
  ```
  Then wire it in below the existing 5xx branch:
  ```js
  } else if (shouldAlert4xx(err, status)) {
      discordAlert({
          level: 'warn',
          message: `${req.method} ${req.originalUrl || req.url} → ${status} (server-side unexpected): ${err?.message || ''}`,
          error: err,
          context: {
              userId: req.user?.userId || req.user?.id || null,
              ip: req.ip,
              status,
          },
      });
  }
  ```

**Tests to add:**
- `tests/middleware/errorHandler.test.js` (NEW) — use `node-mocks-http` (already in devDeps):
  - 5xx → `discordAlert` called with `level: 'error'` (regression guard).
  - 422 with `err.expose=false` → `discordAlert` called with `level: 'warn'`.
  - 400 with `err.expose=true` → `discordAlert` NOT called.
  - 404 → NOT called.
  - 429 → called (NOISY_4XX list).
  - Mock `discordAlert` via `vi.mock('../../src/utils/alert.js', ...)`.

**Verification:**
```bash
npm test -- tests/middleware/errorHandler.test.js
# expected: all green
```

**Commit:**
```
feat(alerts): page Discord on server-side-unexpected 4xx

Adds a shouldAlert4xx() helper that filters out client-input 4xx
(400/401/403/404/415 with err.expose=true) and pages Discord for
408/409/422/425/429/451 plus any 4xx where err.expose is falsy.
```

### Phase 2 — Admin rate limit (in-memory, 30 req / 60s)

**Files to change:**
- `package.json` — add dependency `express-rate-limit` (latest 7.x).
- `src/middleware/adminRateLimit.js` (NEW):
  ```js
  import rateLimit from 'express-rate-limit';

  // 30 requests / 60 s, keyed by authenticated userId fallback to IP.
  // In-memory store (per-process). Multi-replica deployments will get
  // 30*N effective cap — acceptable for current single-container prod.
  export const adminRateLimit = rateLimit({
      windowMs: 60_000,
      max: Number(process.env.ADMIN_RATE_LIMIT_MAX || 30),
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      keyGenerator: (req) =>
          (req.user?.userId || req.user?.id || req.ip || 'anon').toString(),
      handler: (req, res /*, next, options */) => {
          res.status(429).json({
              message: 'Too many admin requests, slow down.',
          });
      },
  });
  ```
- `src/routes/admin.js` — insert **after** `authenticate, requireAdmin` so the
  limit only applies to authenticated admins (defense in depth: prevents leaked
  token from being scraped at full speed):
  ```js
  import { adminRateLimit } from '../middleware/adminRateLimit.js';
  router.use(authenticate, requireAdmin, adminRateLimit);
  ```

**Tests to add:**
- `tests/middleware/adminRateLimit.test.js` (NEW) — Express app fixture:
  - Mount `adminRateLimit` on a stub route, fire 31 requests with the same
    `req.user.userId`, expect first 30 → 200, 31st → 429 with the body shape.
  - Override `ADMIN_RATE_LIMIT_MAX=2` via env, fire 3 requests, expect the 3rd → 429.
- Update `tests/integration/admin.integration.test.js` — set
  `ADMIN_RATE_LIMIT_MAX=1000` in the integration env so existing tests don't
  trip the limiter. Document the override in the file header comment.

**Verification:**
```bash
npm test -- tests/middleware/adminRateLimit.test.js
npm run test:integration  # admin.integration.test.js still green
```

**Commit:**
```
feat(admin): rate-limit admin endpoints (30 req/60s, per-user)

Defense in depth — a leaked admin JWT can no longer be used to scrape
chat history at full bandwidth. In-memory store; the per-process limit
is acceptable for the single-replica prod deployment.

Tunable via ADMIN_RATE_LIMIT_MAX env (default 30).
```

### Phase A.E — PR-A wrap-up
- Update `.env.sample`: add `ADMIN_RATE_LIMIT_MAX=30` (commented).
- Update `README.md` "Operational logs & alerting" section: one-paragraph note
  on 4xx alerting + admin rate limit.
- Open PR `chore: admin hardening — 4xx alerts + admin rate limit`.

---

## 3. PR-B — `feat/admin-chats-cursor-and-active-window`

### Phase 0 — Branch
1. After PR-A is merged: `git checkout main && git pull`
2. `git checkout -b feat/admin-chats-cursor-and-active-window`

### Phase 3 — Cursor pagination on `/api/admin/users/:userId/chats`

**API contract change** (backwards compatible — old `?page=N` keeps working as
fallback):

| Query param | Old | New |
|---|---|---|
| `?page=N` | offset-based (still supported, deprecated) | — |
| `?cursor=<sessionId>` | n/a | NEW: cursor = previous page's last `sessionId` |
| `?pageSize=N` | unchanged | unchanged (default 50, max 200) |

**Response additions:**
```json
{
  "user": {...},
  "sessions": [...],
  "pagination": {
    "pageSize": 50,
    "nextCursor": "sess_abc123",  // null on last page
    "hasMore": true,
    "totalSessions": 1234,         // kept for the UI
    "page": 1                      // present only when ?page= was used (deprecated)
  }
}
```

**Why cursor on `sessionId` (not `id`):** `sessionId` is already a stable
public identifier the frontend has, and it's UNIQUE in `ChatSession`. We sort
by `(updatedAt desc, id desc)` to get a strict total order so cursor paging
is deterministic even when multiple sessions share a `updatedAt`.

**Files to change:**
- `src/controllers/adminController.js` — rewrite `getUserChats`:
  ```js
  export const getUserChats = async (req, res, next) => {
      try {
          const { userId } = req.params;
          const pageSize = Math.min(
              MAX_PAGE_SIZE,
              Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE)
          );
          const cursorSessionId = req.query.cursor || null;
          const legacyPage = req.query.page
              ? Math.max(1, parseInt(req.query.page, 10) || 1)
              : null;

          const user = await prisma.user.findUnique({
              where: { userId },
              select: { id: true, userId: true, name: true, email: true },
          });
          if (!user) return res.status(404).json({ message: 'User not found' });

          // Resolve cursor → (updatedAt, id) anchor for keyset paging.
          let anchor = null;
          if (cursorSessionId) {
              anchor = await prisma.chatSession.findUnique({
                  where: { sessionId: cursorSessionId },
                  select: { id: true, updatedAt: true, userId: true },
              });
              if (!anchor || anchor.userId !== user.id) {
                  return res.status(400).json({ message: 'Invalid cursor' });
              }
          }

          // Build where: (updatedAt < anchor.updatedAt)
          //           OR (updatedAt = anchor.updatedAt AND id < anchor.id)
          const where = { userId: user.id };
          if (anchor) {
              where.OR = [
                  { updatedAt: { lt: anchor.updatedAt } },
                  { updatedAt: anchor.updatedAt, id: { lt: anchor.id } },
              ];
          }

          // Fetch pageSize+1 to detect hasMore.
          const fetched = await prisma.chatSession.findMany({
              where,
              orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
              take: pageSize + 1,
              ...(legacyPage && !cursorSessionId
                  ? { skip: (legacyPage - 1) * pageSize, take: pageSize }
                  : {}),
              select: { /* same as before — keep _count + nested messages */
                  id: true, sessionId: true, title: true, chatbotType: true,
                  provider: true, isActive: true, createdAt: true, updatedAt: true,
                  _count: { select: { messages: true } },
                  messages: {
                      orderBy: { timestamp: 'asc' },
                      take: MAX_MESSAGES_PER_SESSION,
                      select: {
                          id: true, sessionId: true, messageType: true,
                          chatbotType: true, provider: true, content: true,
                          metadata: true, timestamp: true,
                      },
                  },
              },
          });

          // Cursor mode: trim sentinel, compute nextCursor.
          let pageItems = fetched;
          let hasMore = false;
          let nextCursor = null;
          if (!legacyPage || cursorSessionId) {
              hasMore = fetched.length > pageSize;
              pageItems = hasMore ? fetched.slice(0, pageSize) : fetched;
              nextCursor = hasMore ? pageItems[pageItems.length - 1].sessionId : null;
          }

          // totalSessions kept for UI (cheap COUNT, indexed by userId).
          const totalSessions = await prisma.chatSession.count({
              where: { userId: user.id },
          });

          return res.json({
              user,
              sessions: pageItems.map((s) => {
                  const { _count, ...rest } = s;
                  const messageCount = _count.messages;
                  return {
                      ...rest,
                      messageCount,
                      messagesTruncated: messageCount > MAX_MESSAGES_PER_SESSION,
                  };
              }),
              pagination: {
                  pageSize,
                  nextCursor,
                  hasMore,
                  totalSessions,
                  ...(legacyPage ? { page: legacyPage } : {}),
              },
          });
      } catch (err) { next(err); }
  };
  ```

**Frontend change:**
- `test-frontend/src/views/AdminUserChatsView.vue` — switch the "Load more"
  button (or pagination control) to use `nextCursor`:
  - On first load: `GET /api/admin/users/:id/chats?pageSize=50`.
  - On "Load more" click: `?cursor=<lastNextCursor>&pageSize=50`, append to list.
  - Disable button when `pagination.hasMore === false`.
  - Keep `totalSessions` displayed somewhere as a hint ("Showing N of M").

**Tests to add / update:**
- `tests/integration/admin.integration.test.js` — extend the existing
  `getUserChats` block:
  - Seed 7 sessions for one user with descending `updatedAt`.
  - First call with `pageSize=3` → returns 3 sessions, `hasMore=true`,
    `nextCursor` = 3rd session's `sessionId`.
  - Second call with that cursor → returns next 3, `hasMore=true`.
  - Third call → returns 1 session, `hasMore=false`, `nextCursor=null`.
  - Cross-user cursor (use sessionId belonging to another user) → 400 "Invalid cursor".
  - Legacy `?page=2&pageSize=3` still works and returns the right slice (regression).

**Verification:**
```bash
npm run test:integration -- admin.integration.test.js
# Manual: load /admin/users/:id in test-frontend, verify Load More appends correctly.
```

**Commit:**
```
feat(admin): cursor pagination on /api/admin/users/:userId/chats

Keyset paging on (updatedAt desc, id desc) keyed by sessionId cursor.
Old ?page= query stays supported (deprecated). Frontend switched to
Load More with nextCursor.
```

### Phase 4 — `weeklyActiveTimeSec` → session-window heuristic

**Algorithm:** sort each user's messages within the Taipei-week window by
`timestamp asc`. Walk pairwise; whenever `current.timestamp - previous.timestamp
> IDLE_GAP_MS` (default **5 min**), close the current window and open a new one
at `current`. A "window" contributes `(window.lastTs - window.firstTs)` seconds
to active time. Single-message windows contribute 0 (consistent with the old
`count >= 2` guard).

**Why 5 minutes:** matches Google Analytics' default session timeout; long enough
to cover normal "type, send, wait, type" cycles; short enough to break up
"left tab open at midnight" cases.

**Files to change:**
- `src/controllers/adminController.js`:
  - Add constant near other tunables:
    ```js
    const ACTIVE_SESSION_IDLE_GAP_MS = Number(
        process.env.ACTIVE_SESSION_IDLE_GAP_MS || 5 * 60_000
    );
    ```
  - Replace the `userDayRange` logic (lines ~194-218) with a per-user **sorted
    timestamp array** + window-walking helper:
    ```js
    // user.id -> sorted array of message UTC ms timestamps
    const userTs = new Map();
    for (const m of weekMessages) {
        const arr = userTs.get(m.userId) || [];
        arr.push(m.timestamp.getTime());
        userTs.set(m.userId, arr);
    }
    for (const arr of userTs.values()) arr.sort((a, b) => a - b);

    const weeklyActiveSecOf = (userPk) => {
        const arr = userTs.get(userPk);
        if (!arr || arr.length < 2) return 0;
        let total = 0;
        let windowStart = arr[0];
        let windowEnd = arr[0];
        for (let i = 1; i < arr.length; i++) {
            const t = arr[i];
            if (t - windowEnd > ACTIVE_SESSION_IDLE_GAP_MS) {
                total += Math.floor((windowEnd - windowStart) / 1000);
                windowStart = t;
            }
            windowEnd = t;
        }
        total += Math.floor((windowEnd - windowStart) / 1000);
        return total;
    };
    ```
  - Update the `userPks` Set to use `userTs.keys()` instead of `userDayRange.keys()`.
  - Add a code comment block:
    ```js
    // weeklyActiveTimeSec: session-window heuristic.
    // We split the user's week into "sessions" by IDLE_GAP_MS (default 5min)
    // and sum (lastMsg - firstMsg) per session. This avoids the old bug where
    // an 8-hour gap between two messages would be counted as 8 hours of activity.
    // Future improvement (out of scope): the frontend can report
    // Message.metadata.clientActiveMs for true client-active time. See
    // .plan/monitor-logs-followups.md §4 and TODO-ACTIVE-TIME issue.
    ```

**Tests to add:**
- `tests/services/adminController.weeklyActive.test.js` (NEW) — pure-function
  test by extracting `weeklyActiveSecOf` builder OR by exercising the
  controller via integration test:
  - **Preferred:** export `computeWeeklyActiveSec(timestampsMs, idleGapMs)`
    as a named export, unit-test it directly:
    - `[]` → 0
    - `[t]` → 0
    - `[t, t+1min]` (gap < 5min) → 60
    - `[t, t+1min, t+10min]` → 60 (10min gap breaks the second window, single-msg)
    - `[t, t+1min, t+10min, t+11min, t+12min]` → 60 + 120 = 180
    - `[t, t+8h]` → 0 (the regression case from the previous agent's note)
- Add an integration test asserting the new `weeklyActiveTimeSec` shape on
  llm-stats: seed two users, one with 8-hour gap (expect 0), one with three
  messages in 2 minutes (expect 120).

**Verification:**
```bash
npm test -- adminController.weeklyActive
npm run test:integration -- admin.integration.test.js
```

**Commit:**
```
fix(admin): weeklyActiveTimeSec uses 5-min session windows

Previous algorithm used (lastMsg - firstMsg) per day, which counted
"left tab open all night, replied at 3am" as 8h of activity.

New algorithm walks per-user sorted timestamps and breaks a window
whenever the gap exceeds ACTIVE_SESSION_IDLE_GAP_MS (default 5 min).
Sum of (windowEnd - windowStart) across windows = active time.

Tunable via ACTIVE_SESSION_IDLE_GAP_MS env. A future iteration will
use Message.metadata.clientActiveMs for true client-active time.
```

### Phase B.E — PR-B wrap-up
- Update `.env.sample`: `ACTIVE_SESSION_IDLE_GAP_MS=300000` (commented).
- Update `README.md` admin section: note the new cursor query param + active-time semantics.
- File a GitHub issue **"Admin UI: role-gated MainLayout admin card"** and link
  in the PR description (do **not** implement here per Mulkooo's call).
- File a GitHub issue **"Capture clientActiveMs from frontend for true active time"**
  and link in PR description.
- Open PR `feat: admin chats cursor pagination + session-window active time`.

---

## 4. Files Likely to Change / Add

### PR-A
| Path | Change |
|---|---|
| `src/middleware/errorHandler.js` | + `shouldAlert4xx` branch |
| `src/middleware/adminRateLimit.js` | NEW |
| `src/routes/admin.js` | wire `adminRateLimit` |
| `package.json` / `package-lock.json` | + `express-rate-limit` |
| `tests/middleware/errorHandler.test.js` | NEW |
| `tests/middleware/adminRateLimit.test.js` | NEW |
| `tests/integration/admin.integration.test.js` | bump `ADMIN_RATE_LIMIT_MAX` for tests |
| `.env.sample`, `README.md` | docs |

### PR-B
| Path | Change |
|---|---|
| `src/controllers/adminController.js` | cursor paging + session-window active time + extract `computeWeeklyActiveSec` |
| `test-frontend/src/views/AdminUserChatsView.vue` | Load More via `nextCursor` |
| `tests/services/adminController.weeklyActive.test.js` | NEW (unit) |
| `tests/integration/admin.integration.test.js` | + cursor paging + active-time fixtures |
| `.env.sample`, `README.md` | docs |

---

## 5. Risks, Tradeoffs, Notes

- **`express-rate-limit` in-memory store:** if prod ever scales horizontally,
  the per-process cap multiplies by replica count. Acceptable now (single
  container). The day we add a second replica we'll switch to
  `rate-limit-redis`. Documented in code comment.
- **Cursor invalidation:** if a session's `updatedAt` changes between two
  paginated requests (e.g., admin views user A's session list, then a new
  message arrives in one of those sessions), it can briefly appear twice or
  skip. Acceptable for an admin read-only dashboard; we don't lock or snapshot.
- **`computeWeeklyActiveSec` extraction:** keeps the function pure & unit-testable;
  no behavior change beyond the algorithm itself.
- **Backwards compat:** `?page=N` keeps working so we don't break any external
  scripts the team might have. Mark as deprecated in the README and remove in
  a follow-up PR after the frontend is fully migrated.
- **4xx alert noise:** if Phase 1 produces too many warnings in the first week,
  tighten `NOISY_4XX` (drop 422?) — it's a single set literal to edit.

---

## 6. Out of Scope (deferred — file issues, do not implement)

- MainLayout role-based admin-card gate (defer until non-admin users exist).
- Frontend `clientActiveMs` reporting for true active time (next iteration).
- Audit log of admin views.
- Switching `express-rate-limit` to Redis-backed store.
