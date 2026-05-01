### 防止專案崩潰的提醒

- 新增依賴前記得執行 `nvm use`
- 因為 `docker network` 的依賴，一定要先起 `docker-compose.dev.yml` 再起 `docker-compose.prod.yml`

---

## Token 標頭

```
{
    "Authorization": tokenValue
}
```

---

## API 端點（目前）

**需要驗證** 代表請求必須帶上方 Token 標頭。

**總覽**

- GET `/api/alive`
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/user/profile`
- PATCH `/api/user/profile`
- POST `/api/main/updateMetrics`
- GET `/api/main/getMetrics`
- POST `/api/main/getMetrics`
- GET `/api/main/dailyQuestions`
- POST `/api/main/dailyQuestions`
- GET `/api/main/trends`
- POST `/api/main/scales/:code/answers`
- GET `/api/main/scales/sessions`
- POST `/api/chat/sessions`
- GET `/api/chat/sessions`
- POST `/api/chat/sessions/:id/messages`
- GET `/api/chat/sessions/:id/messages`
- DELETE `/api/chat/sessions/:id`
- POST `/api/diaries/`
- GET `/api/diaries`
- POST `/api/diaries/analysis`
- POST `/api/diaries/updateEntry`（已逐步棄用）
- GET `/api/diaries/getHistory`（已逐步棄用）
- POST `/api/diaries/getHistory`（已逐步棄用）
- DELETE `/api/diaries/:entryId`
- POST `/api/reason`
- GET `/api/reason`
- GET `/api/reason/:id`
- PATCH `/api/reason/:id`
- DELETE `/api/reason/:id`
- POST `/api/health/advice`
- GET `/api/health/advice`
- POST `/api/emotion/analysis`（設計稿）
- GET `/api/emotion/analysis`（設計稿）

**健康檢查**

- GET `/api/alive`

**認證**

- POST `/api/auth/register`
- POST `/api/auth/login`

**使用者（需要驗證）**

- GET `/api/user/profile`
- PATCH `/api/user/profile`

**主頁（需要驗證）**

- POST `/api/main/updateMetrics`
- GET `/api/main/getMetrics`
- POST `/api/main/getMetrics`
- GET `/api/main/dailyQuestions`
- POST `/api/main/dailyQuestions`
- GET `/api/main/trends`
- POST `/api/main/scales/:code/answers`
- GET `/api/main/scales/sessions`

**聊天（需要驗證）**

- POST `/api/chat/sessions`
- GET `/api/chat/sessions`
- POST `/api/chat/sessions/:id/messages`
- GET `/api/chat/sessions/:id/messages`
- DELETE `/api/chat/sessions/:id`

**健康建議（需要驗證）**

- POST `/api/health/advice`
- GET `/api/health/advice`

**情緒分析（需要驗證）**

- POST `/api/emotion/analysis`
- GET `/api/emotion/analysis`

**日記（需要驗證）**

- POST `/api/diaries/`
- GET `/api/diaries`
- POST `/api/diaries/analysis`
- POST `/api/diaries/updateEntry`（已逐步棄用，請改用 POST `/api/diaries/`）
- GET `/api/diaries/getHistory`（已逐步棄用，請改用 GET `/api/diaries`）
- POST `/api/diaries/getHistory`（已逐步棄用，請改用 GET `/api/diaries`）
- DELETE `/api/diaries/:entryId`

**理由（需要驗證）**

- POST `/api/reason`
- GET `/api/reason`
- GET `/api/reason/:id`
- PATCH `/api/reason/:id`
- DELETE `/api/reason/:id`

---

## 理由表

| 欄位      | 型別     | 說明               |
| --------- | -------- | ------------------ |
| title     | String   | 原因標題           |
| content   | Text     | 原因內容           |
| date      | DateTime | 同其他日期欄位格式 |
| isDeleted | Boolean  | 軟刪除             |

## 理由 CRUD API

### POST /api/reason

---

- 需要 Token

**請求內容：**

```
{
    "title": "我想變得更健康",
    "content": "為了陪伴家人更久",
    "date": "2025-01-01T10:00:00.000Z"
}
```

**回應：**

```
{
    "message": "Reason created successfully",
    "reason": {
        "id": "68a......",
        "title": "我想變得更健康",
        "content": "為了陪伴家人更久",
        "date": "2025-01-01T10:00:00.000Z",
        "isDeleted": false
    }
}
```

### GET /api/reason

---

- 需要 Token

**Query 參數：**

```
includeDeleted=true
```

**回應：**

```
{
    "message": "Reasons retrieved successfully",
    "reasons": [
        {
            "id": "68a......",
            "title": "我想變得更健康",
            "content": "為了陪伴家人更久",
            "date": "2025-01-01T10:00:00.000Z",
            "isDeleted": false
        }
    ]
}
```

### GET /api/reason/:id

---

- 需要 Token

**Query 參數：**

```
includeDeleted=true
```

**回應：**

```
{
    "message": "Reason retrieved successfully",
    "reason": {
        "id": "68a......",
        "title": "我想變得更健康",
        "content": "為了陪伴家人更久",
        "date": "2025-01-01T10:00:00.000Z",
        "isDeleted": false
    }
}
```

### PATCH /api/reason/:id

---

- 需要 Token

**請求內容：**

```
{
    "title": "新的標題",
    "content": "新的內容",
    "date": "2025-02-01T10:00:00.000Z",
    "isDeleted": false
}
```

**回應：**

```
{
    "message": "Reason updated successfully",
    "reason": {
        "id": "68a......",
        "title": "新的標題",
        "content": "新的內容",
        "date": "2025-02-01T10:00:00.000Z",
        "isDeleted": false
    }
}
```

### DELETE /api/reason/:id

---

- 需要 Token

**回應：**

```
{
    "message": "Reason deleted successfully",
    "reason": {
        "id": "68a......",
        "isDeleted": true
    }
}
```

---

## 日記 CRUD API

### POST /api/diaries

---

- 需要 Token（由 Token 決定 user）

**請求內容：**

```
{
    "content": "今天的心情還不錯",
    "mood": "OKAY",
    "entryDate": "2025-02-01T10:00:00.000Z"
}
```

**回應：**

```
{
    "message": "Diary entry recorded successfully",
    "entry": {
        "id": "68a......",
        "userId": "68a......",
        "mood": "OKAY",
        "entryDate": "2025-02-01T10:00:00.000Z"
    }
}
```

### GET /api/diaries

---

- 需要 Token

**Query 參數：**

```
startDate=2025-02-01T00:00:00.000Z
endDate=2025-02-28T23:59:59.999Z
limit=20
offset=0
```

**回應：**

```
{
    "message": "Diary entries retrieved successfully",
    "entries": [
        {
            "id": "68a......",
            "diaryId": "68a......",
            "userId": "68a......",
            "content": "今天的心情還不錯",
            "mood": "OKAY",
            "entryDate": "2025-02-01T10:00:00.000Z",
            "createdAt": "2025-02-01T10:00:00.000Z",
            "updatedAt": "2025-02-01T10:00:00.000Z"
        }
    ]
}
```

### DELETE /api/diaries/:entryId

---

- 需要 Token

**回應：**

```
{
    "message": "Diary entry deleted successfully",
    "entry": {
        "id": "68a......"
    }
}
```

---

## 日記 API

### POST /api/diaries/updateEntry

---

- 需要 Token
- 改用 POST `/api/diaries/`

**請求內容：**

```json
{
    "entryId": "68a......",
    "content": "更新後的內容",
    "mood": "GOOD",
    "entryDate": "2025-02-02T10:00:00.000Z"
}
```

> `entryId` 為必填，`content`、`mood`、`entryDate` 至少需提供一個。

**回應：**

```json
{
    "message": "Diary entry updated successfully",
    "entry": {
        "id": "68a......",
        "userId": "uuid",
        "mood": "GOOD",
        "entryDate": "2025-02-02T10:00:00.000Z"
    }
}
```

### GET /api/diaries/getHistory

---

- 需要 Token
- 改用 GET `/api/diaries`
- ⚠️ GET 版本從 `req.body` 讀取參數（非標準），建議改用 POST 版本

**請求內容（Body）：**

```json
{
    "startDate": "2025-02-01T00:00:00.000Z",
    "endDate": "2025-02-28T23:59:59.999Z",
    "limit": 20
}
```

**回應：**

```json
{
    "message": "Diary history retrieved successfully",
    "entries": [
        {
            "id": "68a......",
            "userId": "68a......",
            "content": "今天的心情還不錯",
            "mood": "OKAY",
            "entryDate": "2025-02-01T10:00:00.000Z",
            "createdAt": "2025-02-01T10:00:00.000Z",
            "updatedAt": "2025-02-01T10:00:00.000Z"
        }
    ]
}
```

### POST /api/diaries/getHistory

---

- 需要 Token
- 改用 GET `/api/diaries`

**請求內容：**

```json
{
    "startDate": "2025-02-01T00:00:00.000Z",
    "endDate": "2025-02-28T23:59:59.999Z",
    "limit": 20
}
```

**回應：**

```json
{
    "message": "Diary history retrieved successfully",
    "entries": [
        {
            "id": "68a......",
            "userId": "68a......",
            "content": "今天的心情還不錯",
            "mood": "OKAY",
            "entryDate": "2025-02-01T10:00:00.000Z",
            "createdAt": "2025-02-01T10:00:00.000Z",
            "updatedAt": "2025-02-01T10:00:00.000Z"
        }
    ]
}
```

---

## 聊天 API（設計稿）

支援「前端送資料」或「後端自取資料」兩種模式（用 POST / GET）。回應結構固定，前端可直接使用。

### POST /api/chat/sessions

---

- 需要 Token

**請求內容：**
```json
{
    "chatbotType": "INITIAL",  // "MBT" | "CBT" | "MBCT" | "INITIAL"
    "title": "新對話",          // optional；INITIAL 預設為「初談」，其餘預設為「新對話」
    "provider": "gemini"       // "gemini" | "anthropic" (optional, defaults to gemini)
}
```

> **chatbotType 說明**
> | 值 | 說明 |
> |---|---|
> | `INITIAL` | 初談（用戶首次開啟聊天時使用） |
> | `CBT` | 認知行為治療 |
> | `MBT` | 心智化治療 |
> | `MBCT` | 正念認知治療 |

**回應：**
```json
{
    "session": {
        "id": "68a......",
        "title": "初談",
        "chatbotType": "INITIAL",
        "provider": "gemini",
        "createdAt": "2025-02-01T10:00:00.000Z"
    }
}
```

### GET /api/chat/sessions

---

- 需要 Token

**Query 參數：**
```
limit=20
offset=0
```

**回應：**
```json
{
    "sessions": [
        {
            "id": "68a......",
            "title": "初談",
            "chatbotType": "INITIAL",
            "provider": "gemini",
            "createdAt": "2025-02-01T10:00:00.000Z"
        }
    ]
}
```

### POST /api/chat/sessions/:id/messages

---

- 需要 Token

**請求內容：**
```json
{
    "message": "你好"
}
```

**回應：**
```json
{
    "reply": "你好，有什麼我可以幫忙的嗎？",
    "messageId": "68a......",
    "timestamp": "2025-02-01T10:00:00.000Z"
}
```

### GET /api/chat/sessions/:id/messages

---

- 需要 Token

**Query 參數：**
```
limit=50
before=2025-02-01T10:00:00.000Z
```

**回應：**
```json
{
    "messages": [
        {
            "id": "68a......",
            "content": "你好",
            "isFromUser": true,
            "chatbotType": "INITIAL",
            "timestamp": "2025-02-01T10:00:00.000Z"
        }
    ]
}
```

### DELETE /api/chat/sessions/:id

---

- 需要 Token

**回應：**
```json
{
    "message": "Session deleted successfully."
}
```

---

## 健康建議 API（設計稿）

支援「前端送資料」或「後端自取資料」兩種模式（用 POST / GET）。回應結構固定，前端可直接使用。

### POST /api/health/advice

---

- 需要 Token

**請求內容：**

```
{
    "range": {
        "startDate": "2025-02-01T00:00:00.000Z",
        "endDate": "2025-02-28T23:59:59.999Z"
    },
    "metrics": {
        "hrv": [
            { "value": 42, "date": "2025-02-01T10:00:00.000Z" }
        ],
        "sleepHours": [
            { "value": 6.5, "date": "2025-02-01T10:00:00.000Z" }
        ],
        "steps": [
            { "value": 6500, "date": "2025-02-01T10:00:00.000Z" }
        ],
        "weightKg": [
            { "value": 61.2, "date": "2025-02-01T10:00:00.000Z" }
        ]
    }
}
```

**回應：**

```
{
    "summary": "睡眠偏少，壓力略高",
    "items": [
        {
            "title": "提高 HRV",
            "detail": "每天 10 分鐘深呼吸...",
            "severity": "medium"
        },
        {
            "title": "改善睡眠",
            "detail": "睡前減少藍光...",
            "severity": "high"
        }
    ]
}
```

### GET /api/health/advice

---

- 需要 Token

**Query 參數：**

```
startDate=2025-02-01T00:00:00.000Z
endDate=2025-02-28T23:59:59.999Z
```

**回應：**

```
{
    "summary": "睡眠偏少，壓力略高",
    "items": [
        {
            "title": "提高 HRV",
            "detail": "每天 10 分鐘深呼吸...",
            "severity": "medium"
        }
    ]
}
```

---

## 心理量表 API
### ~~GET /api/main/scales/:code/questions~~
* ⚠️ 目前已停用（路由已註解）
* 取得指定量表的題目清單（例：PHQ-9、GAD-7、BSRS-5、RFQ-8）

**請求參數：**
- `code`（Path param）量表代碼，例如 `PHQ-9`

**回應：**
```json
{
    "message": "Scale questions retrieved successfully",
    "scale": {
        "id": "scale_id",
        "code": "PHQ-9",
        "name": "PHQ-9",
        "description": "....",
        "questions": [
            {
                "id": "question_id",
                "order": 1,
                "text": "Over the last 2 weeks, how often have you been bothered by...",
                "isReverse": false
            }
        ]
    }
}
```

### POST /api/main/scales/:code/answers
* 需要 Token
* 提交量表作答並建立量表評估紀錄

**請求內容：**
```json
{
    "userId": "user_uuid",
    "scaleCode": "PHQ-9",
    "answers": [
        { "questionId": "question_id_1", "value": 1 },
        { "questionId": "question_id_2", "value": 3 }
    ]
}
```
* `scaleCode` 可省略，若省略需使用 path param `:code`
* `value` 必須是 1~5 的整數

**回應：**
```json
{
    "message": "Scale answers submitted successfully",
    "session": {
        "id": "session_id",
        "userId": "user_uuid",
        "scaleCode": "PHQ-9",
        "totalScore": 12,
        "createdAt": "2026-03-05T12:00:00.000Z"
    }
}
```

### GET /api/main/scales/sessions
* 需要 Token
* 取得歷史量表紀錄（每個量表最多取 5 筆）

**查詢參數：**
- `userId`（Query）使用者 UUID

**回應：**
```json
{
    "message": "User scale sessions retrieved successfully",
    "scales": [
        {
            "id": "scale_id",
            "code": "PHQ-9",
            "name": "PHQ-9",
            "description": "....",
            "sessions": [
                {
                    "id": "session_id",
                    "totalScore": 12,
                    "createdAt": "2026-03-05T12:00:00.000Z"
                }
            ]
        }
    ]
}
```

---

## 緊急介入 API
### GET /api/emergency/resources
* 需要 Token
* 回傳 24/7 心理健康熱線資源

### POST /api/safety-plan
* 需要 Token
* 建立或更新用戶的危機介入計畫

### GET /api/safety-plan/reasons
* 需要 Token
* 取得「活下去的理由」清單

---

## 藏寶盒 API
### POST /api/keepsake
* 需要 Token
* 每位用戶最多 10 筆

### GET /api/keepsake
* 需要 Token

### DELETE /api/keepsake/:id
* 需要 Token

---

## 健康資料整合 API
### POST /api/health/sync
* 需要 Token
* 同步 Apple HealthKit 資料（HRV、活動量、睡眠品質）

### GET /api/health/patterns
* 需要 Token
* 取得生理節律模式分析

---

## 認證 API
### GET /api/alive
確認伺服器狀態，回應：
```
{ "message": "Server is alive in xxx mode." }
```

### POST api/auth/register

---

**請求內容：**

```
{
    "email": "123456789@gmail.com",
    "password": "Test1234!",          // 最少6個字元
    "name": "Yuming Mitzgo",
    "nickname": "Amy",                // optional
    "dateOfBirth": "2003-09-21",      // required
    "gender": "unknown",              // optional, default "unknown"
    "educationLevel": 0,              // optional, default 0
    "dataAnalysisConsent": false,     // optional, default false
    "emergencyContacts": [],          // optional, max 3
    "mostImportantReasons": ""        // optional
}
```

**回應：**

```
{
    "message": "User registered successfully",
    "user": {
        "id": "68a......",
        "userId": "uuid",
        "email": "test@gmail.com",
        "name": "Yuming Mitzgo",
        "nickname": "Amy",
        "dateOfBirth": "2003-09-21T00:00:00.000Z",
        "gender": "unknown",
        "educationLevel": 0,
        "dataAnalysisConsent": false
    }
}
```

### POST api/auth/login

---

**請求內容：**

```
{
    "email": "123456789@gmail.com"
    "password": "8888888"
}
```

**回應：**

```
{
    "message": "Login successful",
    "success": true,
    "token": "ey......",
    "userData": {
        "userId": "uuid",
        "email": "user@example.com",
        "name": "Yuming Mitzgo",
        "nickname": "Amy",
        "dateOfBirth": "2003-09-21T00:00:00.000Z",
        "gender": "unknown",
        "educationLevel": 0
    }
}
```

---

## Operational logs & alerting (production)

> See `.plan/monitor-and-logs.md` for the full design.

### Backend log files

The prod backend container's stdout/stderr is captured to dated files on the
host via a tiny Node rotator (`scripts/log-rotator.js`) wrapped by
`scripts/entrypoint-prod.sh`:

- Mounted at `./logs/backend-prod/` on the host (bind in `docker-compose.prod.yml`).
- Files named `backend-prod-YYYY-MM-DD.log` (UTC date).
- Rotates at UTC midnight without a container restart.
- 7-day retention; older files pruned automatically.
- `current.log` symlink always points at today's file.
- `docker logs mindecho_backend_prod` keeps working (Docker's `json-file`
  driver is a separate safety net, capped at 50 MB x 7 files).

Tune via env: `LOG_DIR` (default `/app/logs`), `LOG_RETENTION_DAYS` (default `7`).

### Discord alerts

`src/utils/alert.js` POSTs to a Discord Incoming Webhook on:

- Express 5xx responses (via `src/middleware/errorHandler.js`)
- `unhandledRejection` / `uncaughtException` (in `src/server.js`)

Alerts are no-ops unless **both** are true:

- `NODE_ENV=production`
- `DISCORD_ALERT_WEBHOOK_URL` is set in `.env`

Built-in safeguards: 60s dedupe with `repeated N times` follow-up, >=2s min
interval between sends, 50/min cap with one-shot overflow notice, honors
HTTP 429 `Retry-After`.

### Manual verification (only the human owner runs this)

The agent must never bring up `docker-compose.prod.yml`. After a PR is
merged, the owner should:

1. Set `DISCORD_ALERT_WEBHOOK_URL=...` in prod `.env`.
2. `docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend`
3. Confirm `./logs/backend-prod/backend-prod-YYYY-MM-DD.log` appears and
   `current.log` resolves to it.
4. Trigger a 5xx (e.g. by hitting a known-broken route) -> confirm the
   Discord embed lands in the alerts channel.
