# AGENTS.md — Primary Guidance for AI Developer Agents

This file is the **primary guidance document** for any AI agent (Hermes, Claude, Codex,
OpenCode, etc.) working on the `mindecho_backend` project. Read this **before** making
any changes to the repository.

> Companion docs: see `README.md` for project overview, `docs/` for architecture
> notes, and `docker-compose.*.yml` files for environment definitions.

---

## 🛑 Hard Rules (NEVER violate)

These rules are non-negotiable. Violating them can corrupt shared state, leak secrets,
or break production. If a task seems to require breaking one of these rules, **stop
and ask the human owner first**.

### Rule 1 — Branching: never touch `main` directly

- **NEVER** commit, push, rebase, force-push, or merge directly to the `main` branch.
- **ALWAYS** create a dedicated feature branch for every change, no matter how small
  (typos, doc tweaks, hotfixes — all of them).
- Branch naming convention:
  - `feature/<short-description>` — new functionality
  - `fix/<short-description>` — bug fixes
  - `chore/<short-description>` — tooling, deps, docs, refactors
  - `test/<short-description>` — test-only changes
- Workflow:
  1. `git checkout main && git pull`
  2. `git checkout -b feature/my-change`
  3. Make changes, commit with clear messages.
  4. Push the branch and open a Pull Request for human review.
  5. **Do not self-merge into `main`.** The human owner merges.

### Rule 2 — Testing: only `docker-compose.test.yml` may be deployed by the agent

- **ALWAYS** verify new features with unit tests and/or integration tests before
  declaring work complete.
- The agent may **only** bring up the test environment:
  ```bash
  docker compose -f docker-compose.test.yml up -d --build
  docker compose -f docker-compose.test.yml down -v
  ```
- **NEVER** run `docker compose up` against `docker-compose.dev.yml` or
  `docker-compose.prod.yml`. Those environments are reserved for the human owner
  and may touch real data, real ports, or real infrastructure.
- Test commands the agent may run:
  - `npm test` (unit tests via Vitest — `vitest.config.js`)
  - `npm run test:integration` or the equivalent script using
    `vitest.integration.config.js`
  - Any `scripts/` helpers explicitly designed for the test profile.
- If a feature cannot be validated under `docker-compose.test.yml`, **document the
  gap** in the PR description and ask the human owner to run the dev/prod check
  manually — do not run it yourself.

---

## ✅ Standard Workflow Checklist

For every task:

- [ ] Pull latest `main`, branch off with the correct prefix.
- [ ] Make focused, atomic commits with descriptive messages.
- [ ] Add or update unit / integration tests covering the change.
- [ ] Run the test suite under `docker-compose.test.yml` (or local Vitest if the
      change doesn't need containers) and confirm green.
- [ ] Update relevant docs (`README.md`, `docs/`, this file) when behavior changes.
- [ ] Push the branch and open a PR; **never** merge into `main` yourself.
- [ ] Log noteworthy decisions (architecture changes, dependency additions, anything
      affecting prod) in the PR description so the human owner can review.

---

## 🧭 Decision Logging

When in doubt — especially around:

- Modifying anything outside the project working tree
- Adding new external services / dependencies
- Changing database schema (`prisma/`)
- Editing `docker-compose.dev.yml` or `docker-compose.prod.yml` (edits are OK; **running** them is not)
- Touching CI workflows in `.github/`

…stop and ask the human owner before proceeding.

---

_Last updated: project bootstrap. Update this file whenever the rules evolve._
