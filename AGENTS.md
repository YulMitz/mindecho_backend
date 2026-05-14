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

### Rule 1 — Compose: never run dev or prod compose

- **NEVER** run `docker compose` against `docker-compose.dev.yml` or
  `docker-compose.prod.yml`. Those environments are reserved for the human owner
  and may touch real data, real ports, or real infrastructure.
- The agent **may** bring up the test environment:
  ```bash
  docker compose -f docker-compose.test.yml up -d --build
  docker compose -f docker-compose.test.yml down -v
  ```
- Editing the dev/prod compose files is OK; **running** them is not.

### Rule 2 — Git: do not commit, push, or deploy

- The agent does light coding tasks in-tree. **Do not** `git commit`, `git push`,
  rebase, force-push, merge, or trigger any deploy. The human owner handles
  version control and deployment.

---

## ✅ Standard Workflow Checklist

For every task:

- [ ] Make focused changes in-tree on the current branch (no branching required).
- [ ] Add or update unit / integration tests covering the change when relevant.
- [ ] Run the test suite under `docker-compose.test.yml` (or local Vitest if the
      change doesn't need containers) and confirm green.
- [ ] Update relevant docs (`README.md`, `docs/`, this file) when behavior changes.
- [ ] **Do not** commit, push, or deploy — leave that to the human owner.
- [ ] Log noteworthy decisions (architecture changes, dependency additions, anything
      affecting prod) in your hand-off message so the human owner can review.

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
