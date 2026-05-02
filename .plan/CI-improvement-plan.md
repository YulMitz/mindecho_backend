## 1. Brief CI fix plan

### Goal
Stop PR CI from failing on:
- missing test Postgres
- live LLM/API checks
- mixed test suites being run together

### Plan
1. **Split CI into 3 lanes**
   - **Unit**: run normal Vitest tests only
   - **Integration**: run DB-backed tests with test Postgres
   - **LLM health checks**: manual or scheduled only, not required for PRs

2. **Make PRs depend only on stable lanes**
   - required: unit
   - optional/conditional: integration
   - not required: live LLM checks

3. **Keep environment-dependent tests out of `npm test`**
   - `tests/llm-connection.test.js` should not run in regular PR CI
   - integration tests should run only with `.env.test` + test DB ready

---

## 2. Exact workflow change I recommend

Your current workflow is too broad because it only does:
```yml
- run: npm test
```

I recommend changing `.github/workflows/test.yml` to something like this:

```yml
name: Run tests

on:
  push:
    branches:
      - '**'
  pull_request:
    branches:
      - '**'
  workflow_dispatch:

jobs:
  unit:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run unit tests only
        run: npx vitest run \
          tests/app.test.js \
          tests/auth.test.js \
          tests/chat.test.js \
          tests/checkin.test.js \
          tests/diary.test.js \
          tests/health.test.js \
          tests/initial-mode.unit.test.js \
          tests/middleware/auth.test.js \
          tests/reason.test.js \
          tests/scales.test.js \
          tests/services/chatService.test.js \
          tests/utils/llm.test.js

  integration:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: mindecho_test
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: mindecho_test
        ports:
          - 5555:5432
        options: >-
          --health-cmd="pg_isready -U mindecho_test -d mindecho_test"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run integration tests
        run: npx vitest run --config vitest.integration.config.js

  llm-health:
    if: github.event_name == 'workflow_dispatch'
runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Run LLM health checks
        run: npx vitest run tests/llm-connection.test.js
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Why this is better
- unit tests stop being polluted by DB/API failures
- integration tests get the DB they expect
- LLM checks only run when intentionally requested

---

## 3. Test classification

### Unit / fast local CI-safe
These are okay for normal PR CI:
- `tests/app.test.js`
- `tests/auth.test.js`
- `tests/chat.test.js`
- `tests/checkin.test.js`
- `tests/diary.test.js`
- `tests/health.test.js`
- `tests/initial-mode.unit.test.js`
- `tests/middleware/auth.test.js`
- `tests/reason.test.js`
- `tests/scales.test.js`
- `tests/services/chatService.test.js`
- `tests/utils/llm.test.js`

### Integration / requires test Postgres
These should run only with DB setup:
- `tests/integration/auth.integration.test.js`
- `tests/integration/chat-initial.integration.test.js`

### Optional health checks / not PR-blocking
These should not run in normal PR CI:
- `tests/llm-connection.test.js`

---

## Extra note
If you want this even cleaner later, I’d also recommend:
- renaming `tests/llm-connection.test.js` to something like:
  - `tests/health/llm-connection.health.test.js`
or moving it outside Vitest’s default test glob entirely