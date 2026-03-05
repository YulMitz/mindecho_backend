## 防止專案崩潰的提醒
* 新增依賴前記得執行 `nvm use`
---
## Token 標頭
```
{
    "Authorization": "Bearer <token>"
}
```
---
## API 端點（目前）
**需要驗證** 代表請求必須帶上方 Token 標頭。

**Base URL**
- Production: `https://mindechoserver.com:8443/api`
- Development: `https://mindechoserver.com:8443/dev-api`

**總覽**
- GET `/api/alive`
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/user/profile`
- PATCH `/api/user/profile`
- GET `/api/main/dailyQuestions`
- POST `/api/main/dailyQuestions`
- GET `/api/main/trends`
- GET `/api/scales`
- POST `/api/assessments`
- GET `/api/assessments/history`
- POST `/api/chat/sessions`
- GET `/api/chat/sessions`
- POST `/api/chat/sessions/:id/messages`
- GET `/api/chat/sessions/:id/messages`
- DELETE `/api/chat/sessions/:id`
- POST `/api/diaries`
- GET `/api/diaries`
- GET `/api/diaries/:id`
- PATCH `/api/diaries/:id`
- DELETE `/api/diaries/:id`
- POST `/api/diaries/analysis`
- GET `/api/emergency/resources`
- POST `/api/safety-plan`
- GET `/api/safety-plan/reasons`
- POST `/api/keepsake`
- GET `/api/keepsake`
- DELETE `/api/keepsake/:id`
- POST `/api/health/sync`
- GET `/api/health/patterns`

---

**健康檢查**
- GET `/api/alive`

**認證**
- POST `/api/auth/register`
- POST `/api/auth/login`

**使用者（需要驗證）**
- GET `/api/user/profile`
- PATCH `/api/user/profile`

**每日指標（需要驗證）**
- GET `/api/main/dailyQuestions`
- POST `/api/main/dailyQuestions`
- GET `/api/main/trends`

**心理量表（需要驗證）**
- GET `/api/scales`
- POST `/api/assessments`
- GET `/api/assessments/history`

**聊天（需要驗證）**
- POST `/api/chat/sessions`
- GET `/api/chat/sessions`
- POST `/api/chat/sessions/:id/messages`
- GET `/api/chat/sessions/:id/messages`
- DELETE `/api/chat/sessions/:id`

**日記（需要驗證）**
- POST `/api/diaries`
- GET `/api/diaries`
- GET `/api/diaries/:id`
- PATCH `/api/diaries/:id`
- DELETE `/api/diaries/:id`
- POST `/api/diaries/analysis`

**緊急介入（需要驗證）**
- GET `/api/emergency/resources`
- POST `/api/safety-plan`
- GET `/api/safety-plan/reasons`

**藏寶盒（需要驗證）**
- POST `/api/keepsake`
- GET `/api/keepsake`
- DELETE `/api/keepsake/:id`

**健康資料整合（需要驗證）**
- POST `/api/health/sync`
- GET `/api/health/patterns`

---

## 日記舊版 API（逐步棄用）
以下 API 目前仍可使用，但會在回應標頭加上 `Deprecation: true`、`Sunset` 與 `Link` 提示，請改用新版 REST 端點。

- POST `/api/diary/updateEntry` → 改用 PATCH `/api/diaries/:id`
- GET `/api/diary/getHistory` → 改用 GET `/api/diaries`
- POST `/api/diary/getHistory` → 改用 GET `/api/diaries`
- POST `/api/chat/sendMessage` → 改用 POST `/api/chat/sessions/:id/messages`
- POST `/api/main/updateMetrics` → 改用 POST `/api/main/dailyQuestions`
- GET `/api/main/getMetrics` → 改用 GET `/api/main/dailyQuestions`
- GET `/api/main/scales/:code/questions` → 改用 GET `/api/scales`
- POST `/api/main/scales/:code/answers` → 改用 POST `/api/assessments`
- GET `/api/main/scales/sessions` → 改用 GET `/api/assessments/history`

---

## 聊天 API
### POST /api/chat/sessions
* 需要 Token

**請求內容：**
```
{
    "mode": "default"   // "default" | "CBT" | "MBT" | "MBCT"
}
```
**回應：**
```
{
    "session": {
        "id": "68a......",
        "title": "新對話",
        "mode": "default",
        "createdAt": "2025-02-01T10:00:00.000Z"
    }
}
```

### GET /api/chat/sessions
* 需要 Token

**Query 參數：**
```
limit=20
offset=0
```
**回應：**
```
{
    "sessions": [
        {
            "id": "68a......",
            "title": "新對話",
            "mode": "default",
            "createdAt": "2025-02-01T10:00:00.000Z"
        }
    ]
}
```

### POST /api/chat/sessions/:id/messages
* 需要 Token

**請求內容：**
```
{
    "message": "你好"
}
```
**回應：**
```
{
    "reply": "你好，有什麼我可以幫忙的嗎？",
    "messageId": "68a......",
    "timestamp": "2025-02-01T10:00:00.000Z"
}
```

### GET /api/chat/sessions/:id/messages
* 需要 Token

**Query 參數：**
```
limit=50
before=2025-02-01T10:00:00.000Z
```
**回應：**
```
{
    "messages": [
        {
            "id": "68a......",
            "content": "你好",
            "isFromUser": true,
            "timestamp": "2025-02-01T10:00:00.000Z",
            "mode": "default"
        }
    ]
}
```

### DELETE /api/chat/sessions/:id
* 需要 Token

**回應：**
```
{
    "message": "Session deleted successfully"
}
```

---

## 日記 CRUD API
### POST /api/diaries
* 需要 Token

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
* 需要 Token

**Query 參數：**
```
startDate=2025-02-01T00:00:00.000Z
endDate=2025-02-28T23:59:59.999Z
limit=20
offset=0
```

### GET /api/diaries/:id
* 需要 Token

### PATCH /api/diaries/:id
* 需要 Token
* 非當日的日記僅限修改一次

### DELETE /api/diaries/:id
* 需要 Token

### POST /api/diaries/analysis
* 需要 Token
* 每 30 天限用一次

**請求內容：**
```json
{
    "mode": "cbt",       // "cbt" or "mbt"
    "provider": "gemini" // "gemini" or "anthropic" (optional, defaults to gemini)
}
```

---

## 心理量表 API
### GET /api/scales
* 需要 Token
* 回傳可用量表清單：PHQ-9、GAD-7、BSRS-5、RFQ-8

### POST /api/assessments
* 需要 Token
* 提交完成的量表並儲存分數與風險等級
* 若 BSRS-5 等量表分數超過安全閾值，回應將包含 `riskAlert: true`

### GET /api/assessments/history
* 需要 Token
* 取得歷史量表紀錄

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

### POST /api/auth/register
**請求內容：**
```json
{
    "email": "user@example.com",
    "password": "minimum6chars",
    "name": "Yuming Mitzgo",
    "nickname": "Yuming",
    "birthday": "2003-09"
}
```

### POST /api/auth/login
**請求內容：**
```json
{
    "email": "user@example.com",
    "password": "minimum6chars"
}
```
**回應：**
```json
{
    "message": "Login successful",
    "token": "ey......",
    "user": {
        "id": "68a......",
        "email": "user@example.com",
        "name": "Yuming Mitzgo"
    }
}
```
