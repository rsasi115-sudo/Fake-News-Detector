# 06 – Backend Architecture

## 6.1 Framework & Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12+ | Runtime |
| Django | 6.0 | Web framework |
| Django REST Framework | 3.16 | REST API toolkit |
| djangorestframework-simplejwt | 5.5 | JWT authentication (access + refresh tokens) |
| django-cors-headers | 4.9 | Cross-origin request support |
| python-dotenv | 1.x | `.env` file loading |
| requests | 2.x | HTTP client (for Ollama, external APIs) |
| SQLite | (bundled) | Development database |

## 6.2 Project Structure

```
backend/
├── manage.py                   # Django management entry-point
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variable template
├── .env                        # Local env vars (git-ignored)
├── db.sqlite3                  # Dev database (git-ignored)
├── config/                     # Django project package
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py             # All settings (env-driven)
│   ├── urls.py                 # Root URL router
│   ├── views.py                # Project-level views (health check)
│   └── wsgi.py
├── accounts/                   # User / auth app
│   ├── __init__.py
│   ├── admin.py                # Custom UserAdmin
│   ├── apps.py
│   ├── models.py               # Custom User (mobile-based)
│   ├── urls.py                 # /api/auth/* routes
│   ├── views.py                # Signup, Login, Me, Refresh views
│   ├── serializers/
│   │   ├── __init__.py
│   │   └── auth.py             # Signup, Login, User serializers
│   ├── services/
│   │   ├── __init__.py
│   │   └── auth.py             # create_user, authenticate_user, get_tokens
│   └── tests/
│       ├── __init__.py
│       └── test_auth.py        # 10 auth endpoint tests
├── analysis/                   # News analysis / NLP app (Phase 5-6)
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── urls.py
│   ├── views.py
│   ├── tests.py
│   ├── serializers/
│   │   └── __init__.py
│   └── services/
│       └── __init__.py
└── venv/                       # Virtual environment (git-ignored)
```

## 6.3 Django Apps

| App | Responsibility | Phase |
|-----|---------------|-------|
| `config` | Project settings, root URL routing, health check | 2 |
| `accounts` | User registration, login, profile management | 3 |
| `analysis` | News verification pipeline, LLM integration | 5–6 |

## 6.4 Settings & Configuration

All runtime configuration is loaded from environment variables (with safe defaults for development). The `.env` file is read via `python-dotenv` at the top of `settings.py`.

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Django secret key | `change-me` |
| `DJANGO_DEBUG` | Debug mode (`1` = on, `0` = off) | `1` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:5173` |
| `DATABASE_URL` | Database connection string (placeholder) | `sqlite:///db.sqlite3` |
| `OLLAMA_BASE_URL` | Ollama API base URL (Phase 6) | `http://localhost:11434` |
| `OLLAMA_MODEL` | LLM model name (Phase 6) | `llama3` |

### Custom User Model

- `AUTH_USER_MODEL = "accounts.User"`
- `USERNAME_FIELD = "mobile"` (10-15 digit string, unique)
- Uses `AbstractBaseUser` + `PermissionsMixin`
- Passwords hashed via Django's default PBKDF2

### DRF defaults

- Renderer: `JSONRenderer` only (no Browsable API in production).
- Parser: `JSONParser`.
- Authentication: `JWTAuthentication` (SimpleJWT).
- Throttling: anonymous 30/min; login 5/min.

### Simple JWT

| Setting | Value |
|---------|-------|
| Access token lifetime | 30 minutes |
| Refresh token lifetime | 7 days |
| Rotate refresh tokens | Yes |
| Auth header type | `Bearer` |

## 6.5 URL Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health/` | No | Liveness probe — returns `{"status":"ok","service":"truthlens-backend"}` |
| POST | `/api/auth/signup/` | No | Register new user (mobile + password) → JWT pair |
| POST | `/api/auth/login/` | No | Authenticate → JWT pair (rate-limited 5/min) |
| POST | `/api/auth/refresh/` | No | Refresh access token |
| GET | `/api/auth/me/` | JWT | Current user profile |
| — | `/api/analysis/` | — | Analysis endpoints (Phase 5) |
| — | `/admin/` | — | Django admin site |

### Standard Response Format

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message." } }
```

## 6.6 Middleware

Order (top → bottom):

1. `corsheaders.middleware.CorsMiddleware`
2. `SecurityMiddleware`
3. `SessionMiddleware`
4. `CommonMiddleware`
5. `CsrfViewMiddleware`
6. `AuthenticationMiddleware`
7. `MessageMiddleware`
8. `XFrameOptionsMiddleware`

## 6.7 Logging

Console-based logging with `verbose` format (`{levelname} {asctime} {module} {message}`). Root logger level: `INFO`.

## 6.8 How to Run

```powershell
# 1. Navigate to backend/
cd backend

# 2. Create & activate virtual environment (first time only)
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy env file (first time only)
Copy-Item .env.example .env
# Edit .env — set a real DJANGO_SECRET_KEY for production

# 5. Run migrations
python manage.py migrate

# 6. Create superuser (optional)
python manage.py createsuperuser

# 7. Start development server
python manage.py runserver 127.0.0.1:8000

# 8. Verify
Invoke-RestMethod http://127.0.0.1:8000/api/health/
# → { "status": "ok", "service": "truthlens-backend" }
```
