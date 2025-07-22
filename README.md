## Reminders to prevent project crash from stupidity
* Remember to `nvm use` whenever to add dependencies to the projects
---
## Token Header
```
{
    "Authorization": tokenValue
}
```
## GET /test
確認伺服器有沒有活著
有活著則回報 `"message": "Basic test working"`

## POST api/auth/register
Request Body:
```
{
    "email": "123456789@gmail.com"
    "password": "8888888" // 最少6個字元
    "firstName": "Yuming"
    "lastName": "Mitzgo"
    "dateOfBirth": "2003-09-21"
}
```
Return:
```
{
    message: 'User registered successfully',
    token,
    user: {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
    }
}
```

## POST api/auth/login
Request Body:
```
{
    "email": "123456789@gmail.com"
    "password": "8888888"
}
```
Return:
```
{
    message: 'Login successful',
    token,
    user: {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
    }
}
```

## POST /main/updateMetrics
### *Token Needed*
Request Body:
```
{
    "userID": user._id,
    "physical": {
        "description": "一般",
        "value": 60
    },
    "mood": {
        "description": "一般",
        "value": 60
    },
    "sleep": {
        "description": "不好",
        "value": 40
    },
    "energy": {
        "description": "一般",
        "value": 60
    },
    "appetite": {
        "description": "良好",
        "value": 80
    },
    "entryDate": "2025-6-30"
}
```

## GET /main/getMetrics
### *Token Needed*
Request Body:
```
{
    "userId": user._id
}
```
Respond Body:
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

## POST /chat/sendMessage
### *Token Needed*
Request Body:
```
{
    "userId": user._id,
    "chatbotType": ["default", "CBT", "MBT"],
    "text": "how to get rid off Monday blue?",
}
```
Respond Body:
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

chat/searchHistory
chat/chatBot/sendMessage
chat/chatBot/retrieveHistory
chat/cbtBot/sendMessage
chat/cbtBot/retrieveHistory
chat/mbtBot/sendMessage
chat/mbttBot/retrieveHistory

track/diary/updateDailyMood
track/diary/getMonthlyMood
track/diary/editDiary
track/diary/analyzeDiary

