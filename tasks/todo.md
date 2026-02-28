# MindEcho Backend – Feb 2026 Task List

> Synced from: `docs/feb-ticket-plan.md`
> Last updated: 2026-02-27

---

## Category 1 — Authentication & Account

- [x] **1-1** Simplify Register: only `email` + `password` required; all other fields nullable
  - `prisma/models/Users.prisma` — `firstName?`, `lastName?`, `dateOfBirth?`
  - `src/controllers/authController.js` — removed mandatory field checks, emergency contact validation

- [x] **1-2** Email uniqueness: return `409 Conflict` (not 400) on duplicate email
  - `src/controllers/authController.js`

- [x] **1-3** Add `dataAnalysisConsent` boolean field to User schema and register endpoint
  - `prisma/models/Users.prisma`
  - `src/controllers/authController.js`
  - `src/services/userService.js` — added to all `select` blocks

- [x] **1-4** Logout with access token + refresh token
  - `prisma/models/Users.prisma` — added `RefreshToken` model
  - `src/controllers/authController.js` — split token generation, new `refresh` + `logout` handlers
  - `src/routes/auth.js` — added `POST /refresh`, `POST /logout`
  - `src/services/userService.js` — added `createRefreshToken`, `findRefreshToken`, `deleteRefreshToken`
  - `.env.sample` — added `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE`

- [ ] **1-5** OAuth Login (Google & Apple)
  - `src/routes/auth.js` — new OAuth routes
  - `src/controllers/authController.js` — new OAuth handlers
  - `src/services/oauthService.js` — new file
  - `prisma/models/Users.prisma` — add `oauthProvider?`, `oauthId?`; make `password` optional

---

## Category 2 — User Profile

- [x] **2-1** Birthday format: store only `birthYear Int?` + `birthMonth Int?` instead of full `DateTime`
  - `prisma/models/Users.prisma`
  - `src/controllers/authController.js`
  - `src/controllers/userController.js`

- [x] **2-2** Merge `firstName` + `lastName` → single `name String?` field
  - `prisma/models/Users.prisma`
  - `src/controllers/authController.js`
  - `src/controllers/userController.js`
  - Data migration SQL: `UPDATE users SET name = first_name || ' ' || last_name`

- [x] **2-3** Verify `nickname` is exposed in `GET /user/profile` and accepted in `PATCH /user/profile`
  - `src/controllers/userController.js` — check read/write; no schema change needed

- [x] **2-4** Emergency contact refactor: support 1–3 contacts, allow non-phone `contactInfo`, all optional
  - `src/controllers/userController.js` — upsert by `sortOrder`, remove phone-only validation
  - Clean up legacy flat fields (`emergencyContactName`, `emergencyContactPhone`, etc.) once relation table is primary

- [x] **2-5** Profile completion `userInfoProgress` field + chatbot gate
  - `prisma/models/Users.prisma` — add `userInfoProgress Int @default(0)`
  - `src/controllers/userController.js` — recalculate on every PATCH
  - `src/middleware/profileGate.js` — new file, block non-`initial` chat sessions if incomplete
  - `src/routes/chat.js` — apply `profileGate` middleware

---

## Category 3 — AI Chat & RAG

- [ ] **3-1** Add MBCT chatbot type
  - `src/controllers/chatController.js` — add `"MBCT"` to valid modes
  - `src/utils/llm.js` — add MBCT system prompt

- [ ] **3-2** Fix chatbot type switching (no context bleed between sessions)
  - `src/controllers/chatController.js` — verify system prompt selected from session's own `mode`
  - `src/utils/llm.js`

- [ ] **3-3** RAG system (pgvector-based)
  - `src/services/ragService.js` — new file
  - `src/services/vectorStore.js` — new file
  - `src/utils/llm.js` — inject retrieved context into prompt
  - Prisma: add `KnowledgeChunk` model with `embedding` vector column
  - Depends on: 3-1, 3-2

- [ ] **3-4** Prompt engineering: humanized tone + Markdown output
  - `src/utils/llm.js` — update all system prompts

- [ ] **3-5** 初談 (initial consultation) mechanism
  - `src/controllers/chatController.js` — add `"initial"` mode
  - `src/utils/llm.js` — add initial consultation system prompt
  - Depends on: 2-5 (profile gate must allow `"initial"` mode)

---

## Category 4 — Risk Detection & Intervention

- [ ] **4-1** Scale score risk alert flag (PHQ-9 ≥ 15, BSRS-5 ≥ 6, GAD-7 ≥ 15)
  - `src/controllers/metricController.js` — check `totalScore` after `POST /main/scales/:code/answers`
  - Return `riskAlert: true`, `riskLevel: "high"` in response

- [ ] **4-2** Diary NLP risk detection
  - `src/services/diaryAnalysisService.js` — add LLM risk classification pass
  - Return `riskFlag` in `POST /diaries/analysis` response

- [ ] **4-3** Keepsake Box API
  - `src/routes/keepsake.js` — new file
  - `src/controllers/keepsakeController.js` — new file
  - `prisma/models/` — add `Keepsake` model
  - `src/app.js` — register `/api/keepsake`
  - Depends on: 4-1 or 4-2

---

## Dependency Map

```
1-1 ──► 2-1, 2-2 (do in same migration)
2-1 + 2-2 + 2-3 + 2-4 ──► 2-5
2-5 ──► 3-5
3-1 + 3-2 ──► 3-3
4-1 or 4-2 ──► 4-3
```

## Progress

- Completed: 9 / 13 tickets (1-1, 1-2, 1-3, 1-4, 2-1, 2-2, 2-3, 2-4, 2-5)
- Remaining: 4 tickets
