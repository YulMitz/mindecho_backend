# Lessons Learned

> Updated after corrections per CLAUDE.md workflow rules.

---

## 2026-02-27

### Don't auto-edit code — give instructions instead
**Context:** CLAUDE.md says "I don't want you to automatically edit my code, rather, I want you to give me instructions."
**Rule:** For code changes, provide step-by-step instructions by default. Only write code directly when the user explicitly says "implement" or "do it".
**Exception:** Documentation files (`.md`, `.sample`) are fine to write directly.

### Migration history can be incomplete — check before running `migrate dev`
**Context:** The `users` table was created outside Prisma migrations. `prisma migrate dev` failed on the shadow DB because it couldn't replay full history.
**Rule:** Before running `migrate dev`, check that all referenced tables exist across the migration chain. If the history is incomplete, use `db push` for dev and write the migration SQL manually for prod.

### Batch schema changes into a single migration
**Context:** Tickets 1-1, 1-3, 1-4 all touched the schema. Each was designed as a separate migration but they were combined into one.
**Rule:** When multiple tickets touch the schema in the same session, batch them into a single migration file to keep history clean and reduce deploy steps.
