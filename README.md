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