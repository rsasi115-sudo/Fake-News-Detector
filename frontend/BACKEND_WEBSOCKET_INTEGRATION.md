# Backend Integration Guide - Django to Frontend

## Overview

This guide shows how to connect your Django backend analysis process (running in the terminal) to the frontend Scanning Dashboard for real-time terminal output display.

## Architecture

```
Frontend                Backend (Django)         Ollama/Services
   +                        +                         +
   |                        |                         |
   | 1. POST /api/analyze   |                         |
   +------------------------> 2. Start scanning      |
   |                        |                         |
   | 3. WebSocket Connect   |                         |
   <--------WS Connection---+                         |
   |                        |                         |
   |    4. Log Stream       |  5. Run analysis (+     |
   |    Line by line        |     emit logs)          |
   <--------Terminal Data---+<--+ Ollama analysis    |
   |                        |                         |
   | 6. Display with        |                         |
   |    animation           |                         |
   +                        +                         +

User interacts with      Analysis happens      External services
Scanning Dashboard      with logging          do the heavy work
```

## Option 1: WebSocket (Recommended)

### Frontend Setup

The frontend is ready to connect! In `pages/ScanningPage.tsx`:

```typescript
useEffect(() => {
  if (!isScanning) return;

  // Connect to backend WebSocket
  const ws = new WebSocket(`ws://${window.location.host}/api/scan/stream`);

  ws.onopen = () => {
    addTerminalOutput("Connected to backend", "success");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      addTerminalOutput(data.text, data.type);

      // When scan completes
      if (data.status === "completed") {
        addScanResult({
          id: data.id,
          url: currentUrl,
          timestamp: Date.now(),
          status: "completed",
          verdict: data.verdict,
          confidence: data.confidence,
        });
        stopScanning();
      }
    } catch (error) {
      console.error("WebSocket error:", error);
    }
  };

  ws.onerror = () => {
    addTerminalOutput("Connection error", "error");
  };

  return () => ws.close();
}, [isScanning, currentUrl]);
```

### Backend Setup (Django)

**1. Install Channels**

```bash
pip install channels channels-redis
```

**2. Create WebSocket Consumer (`analysis/consumers.py`)**

```python
import asyncio
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from .views import run_analysis_with_logging

logger = logging.getLogger(__name__)

class AnalysisConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.scan_id = None
        logger.info(f"WebSocket connected: {self.channel_name}")

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected: {close_code}")

    async def receive(self, text_data):
        """Receive scan request and start analysis"""
        try:
            data = json.loads(text_data)
            url = data.get('url')
            
            if not url:
                await self.send_log("Error: No URL provided", "error")
                return

            # Store scan info
            self.scan_id = data.get('scan_id', f"scan-{time.time()}")
            
            # Send initial message
            await self.send_log(f"Starting analysis for: {url}", "log")
            
            # Run analysis and stream logs
            await self.run_analysis_with_streaming(url)
            
        except json.JSONDecodeError:
            await self.send_log("Invalid JSON received", "error")

    async def run_analysis_with_streaming(self, url):
        """Run analysis while streaming terminal output"""
        try:
            # Set up logging to emit terminal output
            await self.send_log("Fetching article content...", "log")
            
            # Your existing analysis code here
            result = await asyncio.to_thread(
                run_analysis_blocking,
                url,
                self.emit_log
            )
            
            # Send completion
            await self.send_result({
                'status': 'completed',
                'id': self.scan_id,
                'verdict': result['verdict'],
                'confidence': result['confidence'],
                'text': "Scan completed successfully",
                'type': 'success'
            })
            
        except Exception as e:
            logger.exception("Analysis failed")
            await self.send_log(f"Error: {str(e)}", "error")

    async def send_log(self, message: str, log_type: str = "log"):
        """Send a terminal output log to frontend"""
        await self.send(text_data=json.dumps({
            'type': log_type,
            'text': message,
            'timestamp': time.time()
        }))

    async def send_result(self, result_data: dict):
        """Send final result to frontend"""
        await self.send(text_data=json.dumps(result_data))
```

**3. Create Logging Handler (`analysis/logging_handler.py`)**

```python
import logging
import asyncio
from channels.layers import get_channel_layer

class WebSocketLogHandler(logging.Handler):
    """Custom logging handler that sends logs to frontend via WebSocket"""
    
    def __init__(self, consumer):
        super().__init__()
        self.consumer = consumer

    def emit(self, record):
        """Called when a log record is emitted"""
        try:
            message = self.format(record)
            log_type = self.get_log_type(record.levelname)
            
            # Send to frontend
            asyncio.create_task(
                self.consumer.send_log(message, log_type)
            )
        except Exception:
            self.handleError(record)

    @staticmethod
    def get_log_type(level_name):
        """Map Python logging levels to frontend types"""
        mapping = {
            'DEBUG': 'log',
            'INFO': 'log',
            'SUCCESS': 'success',
            'WARNING': 'warning',
            'ERROR': 'error',
            'CRITICAL': 'error'
        }
        return mapping.get(level_name, 'log')
```

**4. Update Analysis Service (`analysis/services/analysis.py`)**

```python
import logging
from .article_extractor import ArticleExtractor
from .feature_extraction import FeatureExtractor
from .ollama_client import OllamaClient

logger = logging.getLogger(__name__)

def run_analysis_blocking(url, emit_log_callback=None):
    """Main analysis function that logs progress"""
    
    def log_progress(message, level="info"):
        """Helper to emit logs"""
        logger.log(level, message)
        if emit_log_callback:
            emit_log_callback(message, level)
    
    # Step 1: Extract content
    log_progress("Extracting article content from URL...", level=logging.INFO)
    extractor = ArticleExtractor()
    article = extractor.extract(url)
    
    if not article:
        log_progress("Failed to extract article", level=logging.ERROR)
        return None
    
    log_progress("✓ Article extracted successfully", level=logging.INFO)
    
    # Step 2: Extract features
    log_progress("Running feature extraction...", level=logging.INFO)
    feature_extractor = FeatureExtractor()
    features = feature_extractor.extract(article)
    log_progress("✓ Features extracted", level=logging.INFO)
    
    # Step 3: Connect to Ollama
    log_progress("Connecting to Ollama service...", level=logging.INFO)
    ollama = OllamaClient()
    
    # Step 4: Generate embeddings
    log_progress("Generating semantic embeddings...", level=logging.INFO)
    embeddings = ollama.embed(article['content'])
    log_progress("✓ Embeddings generated", level=logging.INFO)
    
    # Step 5: Run analysis
    log_progress("Running verification pipeline...", level=logging.INFO)
    
    log_progress("  - Checking source credibility...", level=logging.INFO)
    source_score = analyze_sources(article)
    
    log_progress("  - Analyzing writing patterns...", level=logging.INFO)
    writing_score = analyze_writing(article)
    
    log_progress("  - Cross-referencing with knowledge base...", level=logging.INFO)
    knowledge_score = analyze_knowledge(article)
    
    # Step 6: Calculate final verdict
    log_progress("Calculating confidence scores...", level=logging.INFO)
    final_score = (source_score + writing_score + knowledge_score) / 3
    verdict = determine_verdict(final_score)
    
    log_progress(f"✓ Analysis complete: {verdict.upper()} ({final_score:.1f}%)", 
                 level=logging.INFO)
    
    return {
        'verdict': verdict,
        'confidence': final_score,
        'details': {
            'source_score': source_score,
            'writing_score': writing_score,
            'knowledge_score': knowledge_score
        }
    }
```

**5. Update URLs (`config/routing.py`)**

```python
from django.urls import re_path
from analysis.consumers import AnalysisConsumer

websocket_urlpatterns = [
    re_path(r'ws/api/scan/stream/$', AnalysisConsumer.as_asgi()),
]
```

**6. Update Django Settings (`config/settings.py`)**

```python
INSTALLED_APPS = [
    # ...
    'daphne',  # Must be first
    'channels',
    # ...
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}
```

## Option 2: REST API with Polling

If WebSocket is not available, use polling:

### Frontend

```typescript
useEffect(() => {
  if (!isScanning) return;

  const poll = async () => {
    try {
      const response = await fetch(`/api/scan/${currentUrl}`);
      const data = await response.json();
      
      // Process each log entry
      data.logs.forEach(log => {
        addTerminalOutput(log.message, log.level);
      });
      
      if (data.status === 'completed') {
        stopScanning();
        addScanResult({
          id: data.id,
          url: currentUrl,
          timestamp: Date.now(),
          status: 'completed',
          verdict: data.verdict,
          confidence: data.confidence,
        });
      }
    } catch (error) {
      addTerminalOutput(`Error: ${error.message}`, 'error');
    }
  };

  // Poll every 500ms
  const interval = setInterval(poll, 500);
  return () => clearInterval(interval);
}, [isScanning]);
```

### Backend

```python
# views.py
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET"])
def get_scan_status(request, url):
    """Get current scan status and logs"""
    # Retrieve from cache/session
    scan_data = request.session.get(f'scan_{url}', {})
    
    return JsonResponse({
        'id': scan_data.get('id'),
        'status': scan_data.get('status', 'pending'),
        'logs': scan_data.get('logs', []),
        'verdict': scan_data.get('verdict'),
        'confidence': scan_data.get('confidence'),
    })
```

## Option 3: Server-Sent Events (SSE)

Middle ground between WebSocket and polling:

### Frontend

```typescript
useEffect(() => {
  if (!isScanning) return;

  const eventSource = new EventSource(
    `/api/scan/stream?url=${encodeURIComponent(currentUrl)}`
  );

  eventSource.addEventListener('log', (event) => {
    const data = JSON.parse(event.data);
    addTerminalOutput(data.text, data.type);
  });

  eventSource.addEventListener('complete', (event) => {
    const data = JSON.parse(event.data);
    addScanResult({
      id: data.id,
      url: currentUrl,
      timestamp: Date.now(),
      status: 'completed',
      verdict: data.verdict,
      confidence: data.confidence,
    });
    stopScanning();
    eventSource.close();
  });

  return () => eventSource.close();
}, [isScanning]);
```

## Terminal Output Format

Emit logs in this format from backend:

```json
{
  "type": "log|success|error|warning",
  "text": "Human readable message",
  "timestamp": 1234567890
}
```

### Example logs from analysis:

```
$ Starting analysis...
$ Fetching article from URL...
✓ Article fetched successfully (2,500 characters)
$ Extracting features...
  - Checking headlines for sensationalism...
  - Analyzing writing tone...
  - Matching against known sources...
✓ Features extracted
$ Connecting to Ollama...
✓ Connected to Ollama (model: mistral)
$ Running verification queries...
  - Query 1/5: Checking source authenticity...
  - Query 2/5: Analyzing factual claims...
  - Query 3/5: Checking historical accuracy...
  - Query 4/5: Evaluating source bias...
  - Query 5/5: Final confidence assessment...
✓ Ollama analysis complete
$ Calculating final score...
✓ Analysis complete: FAKE (87.5%)
```

## Testing

### Test Frontend Connection

```typescript
// In ScanningPage.tsx - replace real backend call
const testWebSocket = () => {
  const ws = new WebSocket('ws://localhost:8000/ws/api/scan/stream/');
  
  ws.onopen = () => {
    console.log('Connected');
    ws.send(JSON.stringify({
      url: 'https://example.com',
      scan_id: 'test-123'
    }));
  };
};
```

### Test Backend Logging

```python
# Quick test
import logging
logger = logging.getLogger(__name__)
logger.info("Test message")
logger.warning("Warning message")
logger.error("Error message")
```

## Deployment Considerations

1. **WebSocket Support**: Requires WebSocket-capable server (Daphne, Uvicorn)
2. **Channels**: Add to requirements.txt
3. **CSRF**: Handle CSRF token for WebSocket connection
4. **Rate Limiting**: Limit scan requests per user
5. **Session Management**: Track scan progress in cache/database
6. **Error Handling**: Graceful fallback on connection loss

## Common Issues

**WebSocket connection refused?**
- Ensure Daphne is running
- Check ws:// vs wss:// (production should use wss://)
- Check ALLOWED_HOSTS in settings

**Logs not appearing?**
- Check logger level is set correctly
- Verify WebSocket message format
- Check browser DevTools Network tab

**Intermittent connection loss?**
- Add reconnection logic in frontend
- Check backend load
- Increase keep-alive timeout

---

See `SCANNING_DASHBOARD_GUIDE.md` for frontend documentation.
