# TruthLens – Backend

> Django + Django REST Framework API server for the TruthLens platform.

## Setup (Windows PowerShell)

### 1. Create virtual environment

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure environment variables

```powershell
cp .env.example .env
# Edit .env and set DJANGO_SECRET_KEY to a real secret
```

### 4. Run the server (after Phase 2 Django init)

```powershell
python manage.py migrate
python manage.py runserver    # http://localhost:8000
```

## Environment Variables

| Variable                | Description                        | Default                     |
| ----------------------- | ---------------------------------- | --------------------------- |
| `DJANGO_SECRET_KEY`     | Django secret key                  | `change-me`                 |
| `DJANGO_DEBUG`          | Debug mode (1 = on, 0 = off)      | `1`                         |
| `DJANGO_ALLOWED_HOSTS`  | Comma-separated allowed hosts      | `localhost,127.0.0.1`       |
| `CORS_ALLOWED_ORIGINS`  | Allowed CORS origins               | `http://localhost:5173`     |
| `DATABASE_URL`          | Database connection string         | `sqlite:///db.sqlite3`      |
| `OLLAMA_BASE_URL`       | Ollama API base URL                | `http://localhost:11434`    |
| `OLLAMA_MODEL`          | LLM model name                     | `llama3`                    |

## Project Structure (after Phase 2)

```
backend/
├── venv/               # Python virtual environment (git-ignored)
├── manage.py
├── config/             # Django project settings
├── api/                # DRF app – endpoints
├── analysis/           # NLP / LLM verification logic
├── requirements.txt
├── .env.example
└── README.md
```
