# Plan — CI Improvement (split unit / integration, sane defaults)

**Date:** 2026-05-02
**Branch (proposed):** `chore/ci-split-unit-integration`
**Status:** PLAN ONLY — coder agent executes after Mulkooo's go-ahead
**Related history:** earlier draft was committed in `ca6ab58` then dropped in `4c690fa`. This is the recovered + scoped version.

> **For coder agent:** Use `subagent-driven-development` skill. This is a single
> focused PR — do not bundle unrelated changes.

---

## 0. Goal

Replace the single brittle `npm test` CI step with a properly tiered pipeline:

1. **Unit tests** run on every push & every PR (fast, no external services).
2. **Integration tests** (Postgres + inference via `docker-compose.test.yml`)
   run **only on PRs targeting `main`** OR when the PR carries the
   `run-integration` label. Manual `workflow_dispatch` also triggers them.
3. **LLM-key-required tests** (`tests/llm-connection.test.js` and any path that
   actually calls Anthropic / Gemini SDKs) are **always skipped in CI** —
   gated by `process.env.CI_LLM_KEYS`. Per Mulkooo's hard rule the Anthropic
   key is prod-shared; we never put it in GH Secrets.

Out of scope (Mulkooo confirmed "都可以先不用" on 2026-05-02):
- prettier `--check` gate
- node_modules cache tweaks beyond `actions/setup-node`'s built-in
- Node version matrix
- Codecov upload
- Branch protection guidance doc

---

## 1. Current Context

- Single workflow: `.github/workflows/test.yml` — runs `npm test` on every push
  and every PR (any branch). `npm test` = `vitest run` over **all** of `tests/`,
  including `tests/llm-connection.test.js` and `tests/utils/llm.test.js`.
- `npm run test:integration` brings up `docker-compose.test.yml` (Postgres +
  inference + backend) with `--wait`, then runs
  `vitest run --config vitest.integration.config.js` over
  `tests/integration/**/*.test.js`.
- Test files (from `find tests -name '*.test.js'`):
  ```
  tests/diary.test.js
  tests/app.test.js
  tests/integration/chat-initial.integration.test.js
  tests/integration/auth.integration.test.js
  tests/integration/admin.integration.test.js
  tests/scales.test.js
  tests/middleware/requireAdmin.test.js
  tests/middleware/auth.test.js
  tests/llm-connection.test.js              ← LLM-key-required
  tests/checkin.test.js
  tests/utils/llm.test.js                   ← MAY require keys (verify)
  tests/utils/llm-metadata.test.js
  tests/utils/alert.test.js
  tests/initial-mode.unit.test.js
  tests/reason.test.js
  tests/services/chatService.test.js        ← previously known to skip on missing keys
  tests/health.test.js
  tests/chat.test.js
  tests/auth.test.js
  ```
- `vitest.config.js` is a minimal default — doesn't exclude integration glob,
  but no `tests/*.test.js` lives under `tests/integration/` so the unit run
  picks up everything else.

---

## 2. Approach

### 2a. Tag LLM-key-required tests with a single guard

Add an env-gated skip helper `tests/_helpers/skipIfNoLlmKeys.js`:

```js
import { describe, it } from 'vitest';

// True when CI explicitly opts into running tests that hit real LLM APIs.
// We NEVER set this in CI (Anthropic key is prod-shared). Mulkooo can
// export CI_LLM_KEYS=1 locally to run them.
export const hasLlmKeys =
    process.env.CI_LLM_KEYS === '1' &&
    !!process.env.ANTHROPIC_API_KEY &&
    !!process.env.GOOGLE_API_KEY;

export const describeLlm = hasLlmKeys ? describe : describe.skip;
export const itLlm = hasLlmKeys ? it : it.skip;
```

Then in each LLM-key-touching file, replace top-level `describe(` with
`describeLlm(` (or `it(` with `itLlm(`) — current files known to need it:

- `tests/llm-connection.test.js` — entire file
- `tests/utils/llm.test.js` — only the suites that mock-or-call providers (audit
  during implementation; if it's already fully mocked, skip this change)
- `tests/services/chatService.test.js` — the 14-known-failing block (per
  the agent's prior memory note that this file has tests needing
  API keys/live docker)

Do **not** add `describeLlm` to suites that are already fully mocked — it
would needlessly skip working tests.

### 2b. Vitest unit config — exclude integration explicitly

Update `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
        exclude: [
            'tests/integration/**',
            'node_modules/**',
        ],
        coverage: {
            reporter: ['text', 'html'],
        },
    },
});
```

(Currently the unit config doesn't exclude integration explicitly — it works
only because integration tests need a live DB and would just fail loudly.
Make it explicit.)

### 2c. Workflows — split into two files

#### `.github/workflows/unit-tests.yml` (replaces current `test.yml`)

```yaml
name: Unit tests

on:
  push:
    branches: ['**']
  pull_request:
    branches: ['**']

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run unit tests
        # CI_LLM_KEYS intentionally unset → LLM-key tests auto-skip.
        run: npm test
        env:
          NODE_ENV: test
```

(Switch `npm install` → `npm ci` for reproducibility — requires committed
`package-lock.json`, which the repo has.)

#### `.github/workflows/integration-tests.yml` (NEW)

```yaml
name: Integration tests

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, labeled]
  workflow_dispatch:

jobs:
  integration:
    # Run on PRs to main always; on labeled PRs only when the label is run-integration.
    if: >
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'pull_request' && github.base_ref == 'main' &&
        (github.event.action != 'labeled' || github.event.label.name == 'run-integration'))
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Create .env.test (CI defaults)
        # vitest.integration.config.js loads .env.test via dotenv.
        # Real secrets are NOT needed — we only stand up the test docker compose.
        run: |
          cat > .env.test <<'EOF'
          NODE_ENV=test
          DATABASE_URL=postgresql://postgres:postgres@localhost:5433/mind_echo_test
          # Admin allowlist for admin integration tests
          ADMIN_USERNAMES=alice
          ADMIN_RATE_LIMIT_MAX=1000
          # Anything else the integration suite needs should be added here.
          EOF

      - name: Run integration tests
        # `npm run test:integration` already brings up docker-compose.test.yml --wait
        # and runs vitest with the integration config.
        run: npm run test:integration
        env:
          NODE_ENV: test

      - name: Tear down test stack
        if: always()
        run: npm run test:integration:down
```

**Notes for coder agent:**
- The exact env list in `.env.test` MUST be reconciled with what
  `tests/integration/globalSetup.js` and the integration tests themselves
  read. Audit before finalizing — list above is the minimum.
- `docker-compose.test.yml` MUST be runnable on `ubuntu-latest` GH runners
  (Docker pre-installed). If it ports to inference container needing Python
  GPU stuff — verify it works headless / CPU-only. If not, the integration
  job needs adjustment (or the inference dep must be mockable).
- Required check for branch protection: only `Unit tests / unit` should
  initially be required. Mulkooo can promote `Integration tests / integration`
  to required after the workflow is stable. (Documented in PR body, not
  enforced by code.)

### 2d. Delete the old `.github/workflows/test.yml`

Mulkooo confirmed CI is currently failing every push — replacing it is the
whole point.

---

## 3. Step-by-Step Plan

### Phase 0 — Branch
1. `git checkout main && git pull`
2. `git checkout -b chore/ci-split-unit-integration`

### Phase 1 — Tag LLM tests
1. Create `tests/_helpers/skipIfNoLlmKeys.js` with the helper above.
2. `npm test 2>&1 | tee /tmp/baseline.txt` — capture which tests currently
   fail without keys. (Must be done locally; coder agent reports to PR body.)
3. For each failing-without-keys test file, replace `describe(` →
   `describeLlm(` (or per-`it` granularity if only some suites need keys).
4. `npm test` again — expected: green (LLM tests now skipped, count visible).
5. **Commit:** `test: gate LLM-key tests behind CI_LLM_KEYS env`

### Phase 2 — Tighten unit config
1. Update `vitest.config.js` per §2b.
2. `npm test` — expected: same green, now with explicit integration exclusion.
3. **Commit:** `chore(vitest): exclude integration glob from unit run`

### Phase 3 — Replace workflow
1. `git rm .github/workflows/test.yml`
2. `write_file` `.github/workflows/unit-tests.yml` per §2c.
3. **Commit:** `ci: rename + tighten unit-tests workflow (npm ci, exclude integration)`

### Phase 4 — Add integration workflow
1. `write_file` `.github/workflows/integration-tests.yml` per §2c.
2. Audit `tests/integration/globalSetup.js` and integration tests for any env
   var the workflow's `.env.test` block doesn't cover; add as needed.
3. **Commit:** `ci: add integration-tests workflow (PR-to-main + label gated)`

### Phase 5 — Verify on a throw-away PR
1. Push branch, open PR.
2. Confirm:
   - Unit workflow runs and passes.
   - Integration workflow runs (because PR targets `main`).
   - If integration workflow fails on first run, debug docker-compose.test.yml
     issues — DO NOT merge until both jobs are green.
3. PR body documents:
   - The `run-integration` label trigger for non-`main` PRs (rare).
   - The `CI_LLM_KEYS=1` opt-in for local LLM-touching tests.
   - Suggested branch protection: require "Unit tests / unit" now,
     "Integration tests / integration" after a week of stability.

---

## 4. Files Likely to Change / Add

| Path | Change |
|---|---|
| `tests/_helpers/skipIfNoLlmKeys.js` | NEW |
| `tests/llm-connection.test.js` | use `describeLlm` |
| `tests/utils/llm.test.js` | use `describeLlm` for non-mocked suites (audit) |
| `tests/services/chatService.test.js` | use `describeLlm` for the 14 currently-failing |
| `vitest.config.js` | + `include` + `exclude` |
| `.github/workflows/test.yml` | DELETED |
| `.github/workflows/unit-tests.yml` | NEW |
| `.github/workflows/integration-tests.yml` | NEW |
| `README.md` | one paragraph: "CI tiers + how to run integration locally" |

---

## 5. Tests / Validation

- Local: `npm test` → green, no LLM-key warnings.
- Local: `CI_LLM_KEYS=1 ANTHROPIC_API_KEY=… GOOGLE_API_KEY=… npm test` → still green
  (or surfaces the same prior pass/fail state — coder agent reports).
- Local: `npm run test:integration` → green under docker-compose.test.yml.
- CI (on PR): unit job green, integration job green.

---

## 6. Risks, Tradeoffs

- **Integration job flakiness on GH runners.** Docker on ubuntu-latest is well
  supported but `docker-compose.test.yml` was designed for the dev's local
  machine — first CI run may surface volume/perms/port issues. Mitigated by
  running on a feature PR first and keeping the workflow gated to PR-to-main.
- **Label-trigger ergonomics.** Contributors on non-`main`-targeted PRs need
  to remember the `run-integration` label. Acceptable for the current solo /
  small team.
- **Skipping LLM tests forever in CI.** Coverage gap is real — Anthropic /
  Gemini wire-format changes could go undetected by CI. Mitigated by
  `tests/utils/llm-metadata.test.js` being a fully mocked unit test that
  catches metadata-shape regressions, and by Mulkooo running
  `CI_LLM_KEYS=1 npm test` locally before significant LLM-related releases.

---

## 7. Out of Scope (Mulkooo's call on 2026-05-02)

- prettier `--check` step
- vitest cache layer beyond `actions/setup-node` `cache: 'npm'`
- Node 20 + 22 matrix
- Codecov / coverage upload
- Branch-protection enforcement document
