## Reminders to prevent project crash from stupidity
* Remember to `nvm use` whenever to add dependencies to the projects
---
## Token Header
```
{
    "Authorization": tokenValue
}
```
---
## API Endpoints (Current)
**Auth required** means the request must include the token header above.

**Health**
- GET `/api/alive`

**Auth**
- POST `/api/auth/register`
- POST `/api/auth/login`

**Users (Auth required)**
- GET `/api/users/profile`
- PATCH `/api/users/profile`

**Main (Auth required)**
- POST `/api/main/updateMetrics`
- GET `/api/main/getMetrics`
- POST `/api/main/getMetrics`
- GET `/api/main/dailyQuestions`
- POST `/api/main/dailyQuestions`
- GET `/api/main/scales/:code/questions`
- POST `/api/main/scales/:code/answers`
- GET `/api/main/scales/sessions`

**Chat (Auth required)**
- POST `/api/chat/createTopic`
- POST `/api/chat/sendMessage`

**Diary (Auth required)**
- POST `/api/diary/`
- POST `/api/diary/updateEntry`
- GET `/api/diary/getHistory`
- POST `/api/diary/getHistory`

### GET /alive
---
確認伺服器有沒有活著
有活著則回報:\
 `"message": "Server is alive in xxx mode."`

### POST api/auth/register
---
**Request Body:**
```
{
    "email": "123456789@gmail.com"
    "password": "8888888" // 最少6個字元
    "firstName": "Yuming"
    "lastName": "Mitzgo"
    "dateOfBirth": "2003-09-21"
}
```
**Return:**
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
**Request Body:**
```
{
    "email": "123456789@gmail.com"
    "password": "8888888"
}
```
**Return:**
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
* Token needed

**description-value pair format:**
```
{
    "awful": 20, 
    "bad": 40, 
    "okay": 60, 
    "good": 80, 
    "great": 100,
}
``` 

**Request Body:**
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
* Token Needed

**Request Body:**
```
{
    "userId": user._id
}
```
**Return:**
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
* Token Needed

**Request Body:**
```
{
    "userId": user._id,
    "chatbotType": ["default", "CBT", "MBT"],
    "text": "how to get rid off Monday blue?",
}
```
**Return:**
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

memo for register
edu/major
occ
sex/gender
surgery experiences?
height/weigt?

question mark for optional or further asking after registering

test on chinese maybe
