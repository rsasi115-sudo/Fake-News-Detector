# Python Requirements Update for Django Channels

Add these packages to `backend/requirements.txt`:

```
channels==4.0.0
channels-redis==4.1.0
daphne==4.0.0
```

## Installation

```bash
cd backend

# Option 1: Append to requirements.txt
echo "channels==4.0.0
channels-redis==4.1.0
daphne==4.0.0" >> requirements.txt

# Option 2: Edit requirements.txt manually and add the lines above

# Install the new packages
pip install -r requirements.txt
```

## What These Packages Do

| Package | Version | Purpose |
|---------|---------|---------|
| `channels` | 4.0.0 | WebSocket and async support for Django |
| `channels-redis` | 4.1.0 | Redis-backed channel layer for multi-process deployment |
| `daphne` | 4.0.0 | ASGI application server (replaces `runserver` for WebSocket support) |

## Current Backend Dependencies

Your existing `backend/requirements.txt` likely contains:
- Django
- djangorestframework
- django-cors-headers
- python-dotenv
- requests
- ollama (or openai, if using cloud LLM)

The three new packages are **additions only** and don't conflict with existing dependencies.

## Verification

After installation, verify:

```bash
python -c "import channels; print(f'Channels {channels.__version__}')"
python -c "import daphne; print(f'Daphne {daphne.__version__}')"
python -c "import channels_redis; print(f'Channels-Redis {channels_redis.__version__}')"
```

All three should import without errors.
