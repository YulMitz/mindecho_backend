## 防止專案崩潰的提醒
* 新增依賴前記得執行 `nvm use`
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

**健康檢查**
- GET `/api/alive`

**認證**
- POST `/api/auth/register`
- POST `/api/auth/login`

**使用者（需要驗證）**
- GET `/api/users/profile`
- PATCH `/api/users/profile`

**主頁（需要驗證）**
- POST `/api/main/updateMetrics`
- GET `/api/main/getMetrics`
- POST `/api/main/getMetrics`
- GET `/api/main/dailyQuestions`
- POST `/api/main/dailyQuestions`
- GET `/api/main/scales/:code/questions`
- POST `/api/main/scales/:code/answers`
- GET `/api/main/scales/sessions`

**聊天（需要驗證）**
- POST `/api/chat/createTopic`
- POST `/api/chat/sendMessage`
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
- POST `/api/diary/`
- GET `/api/diary`
- POST `/api/diary/updateEntry`（已逐步棄用，請改用 PATCH `/api/diary/:id`）
- GET `/api/diary/getHistory`（已逐步棄用，請改用 GET `/api/diary`）
- POST `/api/diary/getHistory`（已逐步棄用，請改用 GET `/api/diary`）
- GET `/api/diary/:id`
- PATCH `/api/diary/:id`
- DELETE `/api/diary/:id`

**理由（需要驗證）**
- POST `/api/reason`
- GET `/api/reason`
- GET `/api/reason/:id`
- PATCH `/api/reason/:id`
- DELETE `/api/reason/:id`

---
## 理由表
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| title | String | 原因標題 |
| content | Text | 原因內容 |
| date | DateTime | 同其他日期欄位格式 |
| isDeleted | Boolean | 軟刪除 |

## 理由 CRUD API
### POST /api/reason
---
* 需要 Token

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
* 需要 Token

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
* 需要 Token

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
* 需要 Token

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
* 需要 Token

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
## 日記 CRUD API（/dev-api/diary 會轉發到 /api/diary）
### POST /api/diary
---
* 需要 Token（由 Token 決定 user）

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

### GET /api/diary
---
* 需要 Token

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

### GET /api/diary/:id
---
* 需要 Token

**回應：**
```
{
    "message": "Diary entry retrieved successfully",
    "entry": {
        "id": "68a......",
        "diaryId": "68a......",
        "userId": "68a......",
        "content": "今天的心情還不錯",
        "mood": "OKAY",
        "entryDate": "2025-02-01T10:00:00.000Z",
        "createdAt": "2025-02-01T10:00:00.000Z",
        "updatedAt": "2025-02-01T10:00:00.000Z"
    }
}
```

### PATCH /api/diary/:id
---
* 需要 Token

**請求內容：**
```
{
    "content": "更新後的內容",
    "mood": "GOOD",
    "entryDate": "2025-02-02T10:00:00.000Z"
}
```
**回應：**
```
{
    "message": "Diary entry updated successfully",
    "entry": {
        "id": "68a......",
        "diaryId": "68a......",
        "userId": "68a......",
        "content": "更新後的內容",
        "mood": "GOOD",
        "entryDate": "2025-02-02T10:00:00.000Z",
        "createdAt": "2025-02-01T10:00:00.000Z",
        "updatedAt": "2025-02-02T10:00:00.000Z"
    }
}
```

### DELETE /api/diary/:id
---
* 需要 Token

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
## 日記舊版 API（逐步棄用）
以下 API 目前仍可使用，但會在回應標頭加上 `Deprecation: true`、`Sunset` 與 `Link` 提示，請改用新版 REST 端點。

### POST /api/diary/updateEntry
---
* 需要 Token
* 改用 PATCH `/api/diary/:id`

### GET /api/diary/getHistory
---
* 需要 Token
* 改用 GET `/api/diary`

### POST /api/diary/getHistory
---
* 需要 Token
* 改用 GET `/api/diary`

---
## 聊天 API（設計稿）
支援「前端送資料」或「後端自取資料」兩種模式（用 POST / GET）。回應結構固定，前端可直接使用。

### POST /api/chat/sessions
---
* 需要 Token

**請求內容：**
```
{
    "mode": "chatMode"
}
```
**回應：**
```
{
    "session": {
        "id": "68a......",
        "title": "新對話",
        "mode": "chatMode",
        "createdAt": "2025-02-01T10:00:00.000Z"
    }
}
```

### GET /api/chat/sessions
---
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
            "mode": "chatMode",
            "createdAt": "2025-02-01T10:00:00.000Z"
        }
    ]
}
```

### POST /api/chat/sessions/:id/messages
---
* 需要 Token

**請求內容：**
```
{
    "message": "你好",
    "mode": "chatMode"
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
---
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
            "mode": "chatMode"
        }
    ]
}
```

### DELETE /api/chat/sessions/:id
---
* 需要 Token
* 可選：刪除或封存對話

**回應：**
```
{
    "message": "Session deleted successfully"
}
```

---
## 健康建議 API（設計稿）
支援「前端送資料」或「後端自取資料」兩種模式（用 POST / GET）。回應結構固定，前端可直接使用。

### POST /api/health/advice
---
* 需要 Token

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
* 需要 Token

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
## 情緒分析 API（設計稿）
支援「前端送資料」或「後端自取資料」兩種模式（用 POST / GET）。回應結構固定，前端可直接使用。

### POST /api/emotion/analysis
---
* 需要 Token

**請求內容：**
```
{
    "range": {
        "startDate": "2025-02-01T00:00:00.000Z",
        "endDate": "2025-02-28T23:59:59.999Z"
    },
    "entries": [
        {
            "date": "2025-02-01T10:00:00.000Z",
            "mood": "OKAY",
            "content": "今天陽光不錯"
        }
    ]
}
```
**回應：**
```
{
    "trend": [
        { "label": "平靜", "ratio": 0.45 },
        { "label": "開心", "ratio": 0.30 }
    ],
    "keywords": ["平靜", "朋友", "陽光"],
    "insight": "本月情緒整體平穩..."
}
```

### GET /api/emotion/analysis
---
* 需要 Token

**Query 參數：**
```
startDate=2025-02-01T00:00:00.000Z
endDate=2025-02-28T23:59:59.999Z
```
**回應：**
```
{
    "trend": [
        { "label": "平靜", "ratio": 0.45 }
    ],
    "keywords": ["平靜", "朋友", "陽光"],
    "insight": "本月情緒整體平穩..."
}
```

### GET /alive
---
確認伺服器有沒有活著
有活著則回報:\
 `"message": "Server is alive in xxx mode."`

### POST api/auth/register
---
**請求內容：**
```
{
    "email": "123456789@gmail.com"
    "password": "8888888" // 最少6個字元
    "firstName": "Yuming"
    "lastName": "Mitzgo"
    "dateOfBirth": "2003-09-21"
}
```
**回應：**
```
{
    "message": "User registered successfully",
    "user": {
        "id": "68a......",
        "email": "test@gmail.com",
        "firstName": "Yuming",
        "lastName": "Mitzgo"
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
    "token": "ey......",
    "user": {
        "id": "68a......",
        "email": "test@gmail.com",
        "firstName": "Yuming",
        "lastName": "Mitzgo"
    }
}
```

### POST /main/updateMetrics
---
* 需要 Token

**description-value 對照表：**
```
{
    "awful": 20, 
    "bad": 40, 
    "okay": 60, 
    "good": 80, 
    "great": 100,
}
``` 

**請求內容：**
```
{
    "userID": "68a......",
    "physical": {
        "description": "okay",
        "value": 60
    },
    "mood": {
        "description": "okay",
        "value": 60
    },
    "sleep": {
        "description": "bad",
        "value": 40
    },
    "energy": {
        "description": "okay",
        "value": 60
    },
    "appetite": {
        "description": "good",
        "value": 80
    }
}
```

### GET /main/getMetrics
---
* 需要 Token

**請求內容：**
```
{
    "userId": user._id
}
```
**回應：**
```
{
    {
        "message": "User mental health metrics retrieved successfully",
        "metrics": [
            {
                "physical": {
                    "description": "okay",
                    "value": 60
                },
                "mood": {
                    "description": "okay",
                    "value": 60
                },
                "sleep": {
                    "description": "okay",
                    "value": 60
                },
                "energy": {
                    "description": "okay",
                    "value": 60
                },
                "appetite": {
                    "description": "okay",
                    "value": 60
                },
                "userId": "6861b3fd0ebffde6bb24d2ff",
                "entryDate": "2025-06-29T22:14:44.009Z",
            }
        ]
    }
}
```

### POST /chat/sendMessage
---
* 需要 Token

**請求內容：**
```
{
    "userId": user._id,
    "chatbotType": ["default", "CBT", "MBT"],
    "text": "how to get rid off Monday blue?",
}
```
**回應：**
```
{
    "message": "Message sent successfully",
    "userMessage": "can you remember what I ask you yesterday?",
    "response": "Yes, I can! Yesterday, you asked me for help to \"walk out the feeling of being inferior.\" I remember we discussed strategies such as:\n\n*   Acknowledging and validating the feeling.\n*   Identifying triggers for the feeling.\n*   Challenging negative thoughts that contribute to the feeling.\n*   Focusing on your strengths and accomplishments.\n*   Practicing self-compassion.\n*   Shifting your focus from comparison to personal growth.\n*   Seeking support from others.\n*   Creating an \"Inferiority-Busting Walk\" routine that involves physical activity, mindfulness, and positive affirmations.\n\nI also remember that you are in an environment where you have to interact with classmates until graduation, which makes dealing with these feelings more challenging.\n\nIs there anything specific about our conversation yesterday that you'd like to revisit, or anything you'd like to explore further today? Perhaps you've had a chance to try some of the strategies we discussed, or maybe you have a new situation you'd like to talk about. I'm here to help in any way I can.\n",
    "timeSent": "2025-07-22T09:31:29.886Z"
}
```
main/psychologicalTest/updatePhq9
main/psychologicalTest/updateGad7
main/psychologicalTest/updateBsrs5
main/psychologicalTest/updateRfq8

main/psychologicalTest/getPhq9
main/psychologicalTest/getGad7
main/psychologicalTest/getBsrs5
main/psychologicalTest/getRfq8

chat/retrieveHistory
chat/sendMessage

diary/updateDailyMood
diary/getMonthlyMood
diary/editDiary
diary/analyzeDiary

meditation/playTrack

註冊備註
edu/major
occ
sex/gender
surgery experiences?
height/weigt?

可選或註冊後再詢問請加問號

可能要加中文測試
