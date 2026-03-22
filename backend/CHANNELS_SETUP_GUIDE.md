# Django Channels Setup Guide for Real-Time Logs

This guide explains how to set up Django Channels for WebSocket-based real-time log streaming in TruthLens.

## Overview

Django Channels extends Django to handle WebSockets, long-running connections, and other protocols beyond HTTP/HTTPS. It's built on top of ASGI (Asynchronous Server Gateway Interface).

## Installation

### 1. Install Required Packages

```bash
pip install channels==4.0.0
pip install channels-redis==4.1.0
pip install daphne==4.0.0
```

**What each package does:**
- `channels`: Django channels support
- `channels-redis`: Redis-backed channel layer for multi-process deployment
- `daphne`: ASGI application server that replaces `runserver`

### 2. Update requirements.txt

Add to `backend/requirements.txt`:

```
channels==4.0.0
channels-redis==4.1.0
daphne==4.0.0
```

Then install:

```bash
pip install -r requirements.txt
```

## Configuration

### 1. Update Django Settings (`backend/config/settings.py`)

Add Channels to INSTALLED_APPS (BEFORE django apps):

```python
INSTALLED_APPS = [
    # Channels
    "daphne",
    
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # Third-party
    "rest_framework",
    "corsheaders",
    
    # Local apps
    "accounts",
    "analysis",
]
```

Add ASGI application settings at the end of settings.py:

```python
# ──────────────────────────────────────────────────────────────────────────
# Django Channels Configuration (ASGI)
# ──────────────────────────────────────────────────────────────────────────

ASGI_APPLICATION = "config.asgi.application"

# Channel layers for WebSocket group messaging
# Use In-Memory layer for development, Redis for production
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
        # For production with Redis:
        # "BACKEND": "channels_redis.core.RedisChannelLayer",
        # "CONFIG": {
        #     "hosts": [("127.0.0.1", 6379)],
        # },
    }
}

# CORS for WebSocket connections (if frontend is on different domain)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",      # Vite dev server
    "http://localhost:3000",       # Alternative ports
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

# Allow WebSocket from same origin
SECURE_WEBSOCKET_ORIGIN = [
    "ws://localhost:5173",
    "ws://localhost:8000",
    "ws://127.0.0.1:5173",
    "ws://127.0.0.1:8000",
]
```

### 2. Create ASGI Configuration (`backend/config/asgi.py`)

Replace the existing content or create if doesn't exist:

```python
"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/stable/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

# Import routing after Django initialization
from config import routing

application = ProtocolTypeRouter({
    # Django's ASGI application to handle traditional HTTP requests
    "http": django_asgi_app,
    
    # WebSocket chat handler with authentication
    "websocket": AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})
```

### 3. Configure WebSocket Routing (`backend/config/routing.py`)

Already created. If missing, copy from above.

## Running the Server

### Development (In-Memory Channel Layer)

```bash
# Stop any existing Django development server

# Navigate to backend
cd backend

# Run Daphne server (replaces runserver)
python manage.py runserver --asgi=daphne 0.0.0.0:8000

# Or use explicit command:
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

**Console output should show:**
```
Starting ASGI server daphne bound to 0.0.0.0:8000
HTTP/2 support enabled
```

### Production (with Redis)

For production deployment, use Redis channel layer:

1. **Install Redis** (or use Redis cloud service)

2. **Update settings.py:**
   ```python
   CHANNEL_LAYERS = {
       "default": {
           "BACKEND": "channels_redis.core.RedisChannelLayer",
           "CONFIG": {
               "hosts": [("localhost", 6379)],  # Or Redis cloud URL
           },
       }
   }
   ```

3. **Run with Daphne:**
   ```bash
   daphne -b 0.0.0.0 -p 8000 config.asgi:application
   ```

4. **Optional: Use multiple worker processes:**
   ```bash
   # With Supervisor or systemd service
   daphne -b 0.0.0.0 -p 8000 --threads 4 config.asgi:application
   ```

## Integrating Log Emission Into Pipeline

See `backend/analysis/services/pipeline_with_logs_example.py` for a complete example.

### Quick Integration Steps:

1. **Update pipeline.py imports:**
   ```python
   from asgiref.sync import async_to_sync
   from config.consumers import emit_log
   ```

2. **Add log helper:**
   ```python
   def _emit_log_sync(analysis_id: str, message: str, level: str = "info"):
       try:
           async_to_sync(emit_log)(analysis_id, message, level)
       except Exception as e:
           logger.error(f"Failed to emit log: {e}")
   ```

3. **Update run_pipeline() to include analysis_id parameter:**
   ```python
   def run_pipeline(analysis_id: str, input_type: str, input_value: str, use_ollama: bool = True):
       # ... Add log calls after each step
       _emit_log_sync(analysis_id, "Analysis started", "info")
       # ... more steps
   ```

4. **Update submit_analysis() to pass analysis_id to run_pipeline():**
   ```python
   # In backend/analysis/services/analysis.py
   def submit_analysis(user, input_type, input_value):
       # ... create analysis_req ...
       analysis_id = str(analysis_req.id)
       
       # Pass analysis_id to pipeline
       context = run_pipeline(
           analysis_id=analysis_id,
           input_type=input_type,
           input_value=input_value,
           use_ollama=use_ollama
       )
       # ...
   ```

## Frontend Integration

The frontend components are already created:
- `frontend/src/components/LogPanel.tsx` - Log display UI
- `frontend/src/hooks/useBackendLogs.ts` - WebSocket connection management

### Usage in Your Analysis Component:

```tsx
import { useBackendLogs } from "@/hooks/useBackendLogs";
import LogPanel from "@/components/LogPanel";

export function AnalysisPage() {
  const [analysisId, setAnalysisId] = useState<string>();

  // Connect to backend logs (enable when analysis starts)
  const { logs, isConnected, isStreaming, clearLogs } = useBackendLogs({
    analysisId,
    enabled: !!analysisId,  // Connect when analysisId is set
    maxLogs: 500,
  });

  const handleStartAnalysis = async (input: string) => {
    // 1. Create analysis and get ID
    const response = await api.post("/analysis/submit/", {
      input_type: "text",
      input_value: input,
    });

    const analysisId = response.data.data.id;
    setAnalysisId(analysisId);  // This will trigger log connection

    // 2. Continue with existing flow...
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Existing processing panel */}
      <div>
        <ProcessingPanel />
      </div>

      {/* New log panel */}
      <div className="h-full">
        <LogPanel
          logs={logs}
          isStreaming={isStreaming}
          onClear={clearLogs}
        />
      </div>
    </div>
  );
}
```

## Testing

### 1. Backend Test

```bash
# In backend directory
python manage.py shell

# In Python shell:
from asgiref.sync import async_to_sync
from config.consumers import emit_log

async_to_sync(emit_log)(
    analysis_id="test-123",
    message="Test log message",
    level="info"
)

# Should see: [emit_log] Sent to group 'logs_test-123'...
```

### 2. Frontend Test

1. Open browser DevTools → Console
2. Start an analysis (this will set analysisId and connect WebSocket)
3. You should see:
   ```
   [WebSocket] Connecting to: ws://localhost:8000/ws/logs/?analysis_id=...
   [WebSocket] Connected
   ```

4. Log messages should appear in both:
   - Browser console (from hook logs)
   - LogPanel UI component

## Troubleshooting

### Issue: Port 8000 already in use
```bash
# Kill existing Django process
# Windows PowerShell:
Get-Process -Name "python" | Where-Object {$_.CommandLine -match "runserver"} | Stop-Process -Force

# Linux/Mac:
lsof -i :8000 | kill -9 <PID>
```

### Issue: WebSocket connection refused
Check:
1. Backend is running with Daphne (not `runserver`)
2. Frontend WebSocket URL matches backend address
3. CORS headers are configured
4. Check browser console for exact error

### Issue: Channel layer not working
1. Check CHANNEL_LAYERS in settings (use InMemoryChannelLayer for dev)
2. Verify routing.py is correct
3. Restart server after any settings changes

### Issue: Logs not appearing in frontend
1. Check if analysis_id is being set correctly
2. Verify WebSocket connection is established in browser DevTools
3. Check Django server logs for emit_log calls
4. Ensure pipeline is calling _emit_log_sync()

## Performance Notes

- **In-Memory Channel Layer**: Good for development, single-process only
- **Redis Channel Layer**: Use for production, multi-process setups
- **Max Logs**: Set to 500-1000 to prevent UI lag; older logs auto-scroll off
- **Log Frequency**: 1-10 logs per second should be fine; very high frequency may cause UI lag

## Additional Resources

- [Django Channels Documentation](https://channels.readthedocs.io/)
- [ASGI Documentation](https://asgi.readthedocs.io/)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**Next Steps:**
1. Install required packages
2. Update Django settings and ASGI configuration
3. Create consumer and routing files (already done)
4. Update pipeline to emit logs (use example as reference)
5. Test with frontend
