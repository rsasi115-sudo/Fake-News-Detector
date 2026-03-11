# 09 – API Specification

## 9.1 Base URL

```
http://localhost:8000/api
```

## 9.2 Authentication Endpoints

All auth endpoints are under `/api/auth/`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup/` | No | Register a new user |
| POST | `/api/auth/login/` | No | Login and get JWT tokens |
| POST | `/api/auth/refresh/` | No | Refresh an access token |
| GET | `/api/auth/me/` | JWT | Get current user profile |

### POST `/api/auth/signup/`

**Request:**
```json
{
  "mobile": "9876543210",
  "password": "MySecurePass1"
}
```

**Success (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "mobile": "9876543210",
      "is_active": true,
      "date_joined": "2026-02-10T12:00:00Z"
    },
    "access": "<jwt-access-token>",
    "refresh": "<jwt-refresh-token>"
  }
}
```

**Error – duplicate mobile (409):**
```json
{
  "success": false,
  "error": { "code": "MOBILE_EXISTS", "message": "A user with this mobile number already exists." }
}
```

### POST `/api/auth/login/`

**Request:**
```json
{
  "mobile": "9876543210",
  "password": "MySecurePass1"
}
```

**Success (200):** Same shape as signup response.

**Error – bad credentials (401):**
```json
{
  "success": false,
  "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid mobile number or password." }
}
```

### POST `/api/auth/refresh/`

**Request:**
```json
{
  "refresh": "<jwt-refresh-token>"
}
```

**Success (200):**
```json
{
  "access": "<new-jwt-access-token>",
  "refresh": "<new-jwt-refresh-token>"
}
```

### GET `/api/auth/me/`

**Headers:** `Authorization: Bearer <access-token>`

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "mobile": "9876543210",
    "is_active": true,
    "date_joined": "2026-02-10T12:00:00Z"
  }
}
```

**Error – no token (401):**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

## 9.3 Analysis Endpoints

| Method | Endpoint           | Description        |
| ------ | ------------------ | ------------------ |
|        |                    |                    |

## 9.4 History / Dashboard Endpoints

| Method | Endpoint           | Description        |
| ------ | ------------------ | ------------------ |
|        |                    |                    |

## 9.5 Request / Response Examples

<!-- JSON examples for key endpoints -->

## 9.6 Error Codes

| Code | Meaning            |
| ---- | ------------------ |
|      |                    |
