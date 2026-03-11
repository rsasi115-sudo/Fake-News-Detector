# TruthLens – Fake News & Misinformation Detection using NLP

> An AI-powered platform that uses Natural Language Processing and Large Language Models to detect and analyze fake news and misinformation in real time.

---

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS |
| Backend    | Django 5, Django REST Framework     |
| LLM        | Llama 3 via Ollama (local)          |
| Database   | SQLite (dev) → PostgreSQL (prod)    |

## Monorepo Structure

```
TruthLens/
├── frontend/          # React + Vite client application
├── backend/           # Django + DRF API server
├── documentation/     # Ordered project documentation (.md)
├── .gitignore
└── README.md          # ← you are here
```

## Prerequisites

- **Node.js** ≥ 18 (or **Bun** ≥ 1.0)
- **Python** ≥ 3.11
- **Ollama** installed locally ([ollama.com](https://ollama.com))
- **Git**

## Quick Start

### 1. Clone the repository

```powershell
git clone https://github.com/<your-username>/TruthLens.git
cd TruthLens
```

### 2. Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env          # then edit .env with real values
# Django project will be initialized in Phase 2
cd ..
```

### 3. Frontend Setup

```powershell
cd frontend
npm install        # or: bun install
cp .env.example .env
npm run dev        # starts on http://localhost:5173
cd ..
```

### 4. Start Ollama (in a separate terminal)

```powershell
ollama pull llama3
ollama serve       # runs on http://localhost:11434
```

### 5. Run Backend (after Phase 2)

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver     # runs on http://localhost:8000
```

## Development Ports

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:8000        |
| Ollama   | http://localhost:11434       |

## Documentation

All project documentation lives in the `documentation/` folder with ordered filenames (`01-OVERVIEW.md`, `02-PROBLEM-STATEMENT.md`, etc.). See that folder for full details.

## License

MIT
