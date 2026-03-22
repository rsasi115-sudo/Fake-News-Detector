# Real-Time Backend Logs Implementation

## Overview

This document describes the complete implementation of real-time backend processing logs displayed in the React frontend. The system captures logs at each pipeline stage and streams them via WebSocket to show live terminal-like output during analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  HeroSection                                                        │
│  ├─ useNewsAnalysis() → streamId                                    │
│  ├─ useBackendLogs(streamId) → logs[], isStreaming                  │
│  └─ Two-panel layout:                                               │
│     ├─ Left: VerificationProgress (UI steps)                        │
│     └─ Right: LogPanel (terminal-style logs)                        │
│                                                                     │
│  WebSocket Connection                                               │
│  └─ ws://localhost:8000/ws/logs/?analysis_id={streamId}             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend (Django)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SubmitAnalysisView                                                 │
│  ├─ Generate: stream_id = str(analysis_request.id)                  │
│  ├─ Call: submit_analysis(..., stream_id=stream_id)                 │
│  └─ Return: {success, data={...result..., stream_id}}               │
│                                                                     │
│  Pipeline Execution (run_pipeline)                                  │
│  ├─ Stage 1: Validation                                             │
│  │   └─ emit_analysis_log(..., "Validating input...", category)     │
│  ├─ Stage 2: Extraction                                             │
│  │   └─ emit_analysis_log(..., "Extracting article...", category)   │
│  ├─ Stage 3: Preprocessing                                          │
│  │   └─ emit_analysis_log(..., "Preprocessing...", category)        │
│  ├─ Stage 4: Scoring                                                │
│  │   └─ emit_analysis_log(..., "Computing score...", category)      │
│  ├─ Stage 5: Report Building                                        │
│  │   └─ emit_analysis_log(..., "Building report...", category)      │
│  └─ Stage 6: LLM Analysis                                           │
│      └─ emit_analysis_log(..., "Running AI analysis...", category)  │
│                                                                     │
│  emit_analysis_log() → Sync wrapper → async emit_log()              │
│  └─ Send to WebSocket group: logs_{stream_id}                       │
│                                                                     │
│  LogStreamConsumer (WebSocket Handler)                              │
│  ├─ connect(): Join group logs_{analysis_id}                        │
│  ├─ log_message(): Receive logs and send to client                  │
│  └─ emit_log(): Broadcast to all clients in group                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. **Frontend → Backend: Initiate Analysis**

```typescript
// HeroSection.tsx
const { streamId, isAnalyzing, steps, analyze } = useNewsAnalysis();

// User clicks "Analyze"
await analyze("https://example.com/news");
// Calls: POST /api/analysis/submit/
// Body: { input_type: "url", input_value: "https://..." }
```

### 2. **Backend: Generate Stream ID**

```python
# views.py - SubmitAnalysisView.post()
analysis_req = submit_analysis(
    user=request.user,
    input_type=...,
    input_value=...,
    stream_id=str(None)  # Will be set
)
stream_id = str(analysis_req.id)  # Generate unique stream ID

# Return to frontend
return Response({
    "success": True,
    "data": {
        ...analysis_request_data...,
        "stream_id": stream_id
    }
})
```

### 3. **Frontend: Connect WebSocket + Display Logs**

```typescript
// HeroSection.tsx - After analysis starts
const { logs, isStreaming } = useBackendLogs({
  analysisId: streamId,  // From API response
  enabled: !!streamId && isAnalyzing,
  maxLogs: 500,
});

// Render two panels
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <VerificationProgress ... />
  <LogPanel logs={logs} isStreaming={isStreaming} />
</div>
```

### 4. **WebSocket Connection Established**

```
Frontend → ws://localhost:8000/ws/logs/?analysis_id={streamId}
Backend  → LogStreamConsumer.connect() → Join group "logs_{streamId}"
```

### 5. **Backend: Emit Logs During Pipeline**

```python
# pipeline.py - At each processing stage
from analysis.services.stream_logs import emit_analysis_log

emit_analysis_log(
    stream_id=stream_id,
    message="Validating input...",
    level="info",
    category="pipeline"
)

# Later...
emit_analysis_log(
    stream_id=stream_id,
    message="Article extracted: 'Example Title'",
    level="success",
    category="pipeline"
)
```

### 6. **Backend: Broadcast Logs to WebSocket Group**

```python
# consumers.py - emit_log() async function
await channel_layer.group_send(
    f"logs_{stream_id}",
    {
        "type": "log.message",
        "message": "Validating input...",
        "level": "info",
        "category": "pipeline",
        "timestamp": timestamp,
    }
)
```

### 7. **Frontend: Receive & Display Logs**

```typescript
// useBackendLogs hook receives WebSocket message
{
  timestamp: "2026-03-21T12:01:05.123Z",
  level: "info",
  message: "Validating input...",
  category: "pipeline"
}

// LogPanel renders in terminal style
<div className="bg-gray-950 text-white font-mono text-sm">
  [12:01:05] Validating input...
</div>
```

## Key Components

### Backend

#### **services/stream_logs.py** (NEW)
Provides synchronous wrapper for emitting logs from sync pipeline code.

```python
from asgiref.sync import async_to_sync
from config.consumers import emit_log

def emit_analysis_log(*, stream_id: str | None, message: str, level: str, category: str):
    """Emit a log message synchronously during pipeline execution."""
    if not stream_id:
        return
    
    try:
        async_to_sync(emit_log)(
            stream_id=stream_id,
            message=message,
            level=level,
            category=category
        )
    except Exception as e:
        logger.warning(f"Failed to emit log: {e}")
```

#### **config/consumers.py** (MODIFIED)
WebSocket consumer that handles real-time log streaming.

```python
class LogStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.analysis_id = self.scope['query_string'].decode().split('analysis_id=')[1]
        self.group_name = f'logs_{self.analysis_id}'
        
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def log_message(self, event):
        """Receive log from group and send to WebSocket client."""
        await self.send(text_data=json.dumps({
            'timestamp': event['timestamp'],
            'level': event['level'],
            'message': event['message'],
            'category': event['category'],
        }))

    @staticmethod
    async def emit_log(stream_id, message, level, category):
        """Broadcast log to all clients in the group."""
        await channel_layer.group_send(
            f'logs_{stream_id}',
            {
                'type': 'log.message',
                'message': message,
                'level': level,
                'category': category,
                'timestamp': datetime.now().isoformat(),
            }
        )
```

#### **services/analysis.py** (MODIFIED)
Service layer updated to accept and pass stream_id.

```python
def submit_analysis(
    *, 
    user: "User", 
    input_type: str, 
    input_value: str,
    stream_id: str | None = None
) -> AnalysisRequest:
    """Submit analysis with optional stream_id for live logging."""
    request = AnalysisRequest.objects.create(
        user=user,
        input_type=input_type,
        input_value=input_value,
    )
    
    # Pass stream_id to pipeline for log emission
    pipe_ctx = run_pipeline(
        input_type=input_type,
        input_value=input_value,
        stream_id=stream_id,
    )
    
    # ... persist result ...
    return request
```

#### **services/pipeline.py** (MODIFIED)
Pipeline stages instrumented with log emission.

```python
def run_pipeline(input_type, input_value, stream_id=None):
    """Main verification pipeline with live logging."""
    
    emit_analysis_log(
        stream_id=stream_id,
        message="Submitting to backend...",
        level="info",
        category="pipeline"
    )
    
    # Stage 1: Validation
    emit_analysis_log(stream_id=stream_id, message="Validating input...", ...)
    ctx = validate_input(ctx)
    
    # Stage 2: Extraction
    emit_analysis_log(stream_id=stream_id, message="Extracting article...", ...)
    ctx = extract_article(ctx)
    
    # Stage 3: Preprocessing
    emit_analysis_log(stream_id=stream_id, message="Preprocessing & text cleaning...", ...)
    ctx = preprocess_text(ctx)
    
    # Stage 4: Scoring
    emit_analysis_log(stream_id=stream_id, message="Computing credibility score...", ...)
    ctx = compute_score(ctx)
    
    # Stage 5: Report
    emit_analysis_log(stream_id=stream_id, message="Building verification report...", ...)
    ctx = build_report(ctx)
    
    # Stage 6: LLM
    emit_analysis_log(stream_id=stream_id, message="Running explainable AI...", ...)
    ctx = _run_llm_stage(ctx)
    
    emit_analysis_log(
        stream_id=stream_id,
        message=f"✓ Analysis complete: {verdict} (Score: {score}%)",
        level="success",
        category="pipeline"
    )
    
    return ctx
```

#### **views.py** (MODIFIED)
API endpoint now generates and returns stream_id.

```python
class SubmitAnalysisView(APIView):
    def post(self, request):
        serializer = AnalysisRequestCreateSerializer(data=request.data)
        
        analysis_req = submit_analysis(
            user=request.user,
            input_type=serializer.validated_data["input_type"],
            input_value=serializer.validated_data["input_value"],
            stream_id=str(None),  # Will be set
        )
        
        # Generate stream_id from analysis request ID
        stream_id = str(analysis_req.id)
        
        # Include in API response
        data = AnalysisRequestDetailSerializer(analysis_req).data
        data["stream_id"] = stream_id
        
        return Response({
            "success": True,
            "data": data
        }, status=201)
```

### Frontend

#### **hooks/useBackendLogs.ts**
Custom hook for WebSocket connection and log management (pre-existing).

```typescript
interface UseBackendLogsOptions {
  analysisId: string;
  enabled?: boolean;
  maxLogs?: number;
}

export const useBackendLogs = (options: UseBackendLogsOptions) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  useEffect(() => {
    if (!options.enabled || !options.analysisId) return;
    
    // Connect to WebSocket
    const ws = new WebSocket(
      `ws://localhost:8000/ws/logs/?analysis_id=${options.analysisId}`
    );
    
    ws.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLogs((prev) => {
        const updated = [...prev, log];
        return updated.slice(-options.maxLogs);
      });
    };
    
    return () => ws.close();
  }, [options.analysisId, options.enabled]);
  
  return { logs, isConnected, isStreaming, clearLogs: () => setLogs([]) };
};
```

#### **hooks/useNewsAnalysis.ts** (MODIFIED)
Analysis hook updated to capture and return stream_id.

```typescript
export type AnalysisState = {
  isAnalyzing: boolean;
  currentStep: number;
  progressPercent: number;
  steps: VerificationStep[];
  result: AnalysisResult | null;
  error: string | null;
  streamId: string | null;  // NEW
};

export const useNewsAnalysis = () => {
  // ... existing code ...
  
  const analyze = useCallback(async (content: string) => {
    // Call API
    const res = await api.post<BackendAnalysisResponse>("/analysis/submit/", payload);
    
    // Extract stream_id from response
    const streamId = res.data?.stream_id || null;
    
    // Update state with stream_id
    setState((prev) => ({
      ...prev,
      isAnalyzing: false,
      result: analysisResult,
      streamId,  // Store for WebSocket connection
    }));
    
    return analysisResult;
  }, []);
  
  return {
    ...state,
    analyze,
    reset,
    setResult,
  };
};
```

#### **components/HeroSection.tsx** (MODIFIED)
Main UI component showing two-panel layout during analysis.

```typescript
import LogPanel from "./LogPanel";
import { useBackendLogs } from "@/hooks/useBackendLogs";

const HeroSection = () => {
  const { isAnalyzing, steps, currentStep, progressPercent, result, streamId, analyze } = useNewsAnalysis();
  
  // Connect WebSocket using stream_id
  const { logs, isStreaming } = useBackendLogs({
    analysisId: streamId || "",
    enabled: !!streamId && isAnalyzing,
    maxLogs: 500,
  });
  
  return (
    <section>
      {/* ... existing UI ... */}
      
      {isAnalyzing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Verification Progress */}
          <VerificationProgress
            steps={steps}
            currentStep={currentStep}
            progressPercent={progressPercent}
          />
          
          {/* Right Panel: Live Logs */}
          <LogPanel
            logs={logs}
            isStreaming={isStreaming}
            onClear={() => {}}
          />
        </div>
      )}
    </section>
  );
};
```

#### **components/LogPanel.tsx** (PRE-EXISTING)
Terminal-style log display with color-coding and auto-scroll.

```typescript
interface LogPanelProps {
  logs: LogEntry[];
  isStreaming?: boolean;
  onClear?: () => void;
}

export const LogPanel = ({ logs, isStreaming, onClear }: LogPanelProps) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  return (
    <div className="bg-gray-950 rounded-lg p-4 h-full flex flex-col">
      <div className="flex justify-between mb-3">
        <span className="text-xs text-white/60 flex items-center gap-1">
          {isStreaming && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          Live Logs
        </span>
        <button onClick={onClear} className="text-xs text-white/40 hover:text-white/60">
          Clear
        </button>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-auto font-mono text-sm space-y-1">
        {logs.map((log, idx) => (
          <div
            key={idx}
            className={`text-xs ${
              log.level === "success" ? "text-green-400" :
              log.level === "error" ? "text-red-400" :
              log.level === "warning" ? "text-yellow-400" :
              "text-blue-400"
            }`}
          >
            [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Log Categories

### Pipeline Logs
Category: `"pipeline"`

Logs that track the progression through verification stages:
- "Submitting to backend..."
- "Validating input..."
- "Extracting article from URL..."
- "Preprocessing & text cleaning..."
- "Computing credibility score..."
- "Building verification report..."
- "Running explainable AI analysis..."

### Command Logs
Category: `"commands"`

Detailed execution logs from internal processing (for future use):
- Shell command execution
- External API calls
- File operations

## Log Levels

- **info**: General progress messages (blue)
- **success**: Stage completed successfully (green)
- **warning**: Non-fatal errors, alternate paths (yellow)
- **error**: Fatal errors (red)
- **debug**: Detailed debugging info (gray)

## WebSocket Configuration

### URL Pattern
```
ws://localhost:8000/ws/logs/?analysis_id={stream_id}
```

### Message Format
```json
{
  "timestamp": "2026-03-21T12:01:05.123Z",
  "level": "info|success|warning|error|debug",
  "message": "Step description",
  "category": "pipeline|commands"
}
```

### Channel Groups
- Group name: `logs_{stream_id}`
- Consumer: `LogStreamConsumer`
- Auto-cleanup when client disconnects

## Django Settings Required

```python
# settings.py

# Django Channels
INSTALLED_APPS = [
    ...
    'daphne',
    'channels',
    ...
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}

# For production, use Redis:
# CHANNEL_LAYERS = {
#     'default': {
#         'BACKEND': 'channels_redis.core.RedisChannelLayer',
#         'CONFIG': {
#             'hosts': [('127.0.0.1', 6379)],
#         },
#     },
# }
```

## Frontend Environment

Required environment variables in `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000
```

## Testing the Implementation

### Manual Test: Backend
```bash
# 1. Start Django with Daphne
python manage.py runserver

# 2. Submit analysis via API
curl -X POST http://localhost:8000/api/analysis/submit/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "url",
    "input_value": "https://example.com/article"
  }'

# Response should include stream_id:
{
  "success": true,
  "data": {
    "id": 123,
    "stream_id": "123",
    "result": {...}
  }
}
```

### Manual Test: Frontend
```bash
# 1. Start development server
cd frontend
npm run dev

# 2. Open browser DevTools → Network → WS
# 3. Start analysis from UI
# 4. Watch WebSocket messages come through

# Expected messages:
[12:01:05] Submitting to backend...
[12:01:06] Validating input...
[12:01:07] Extracting article...
...
```

### Browser Console Debug
```javascript
// Monitor WebSocket
ws.addEventListener('message', (event) => {
  console.log('Log received:', JSON.parse(event.data));
});

// Check connection
console.log('WS readyState:', ws.readyState); // 1 = OPEN
```

## Performance Considerations

1. **Max Logs Buffer**: Frontend maintains max 500 logs per stream to prevent memory bloat
2. **Channel Layer**: In-memory for dev, Redis recommended for production
3. **Broadcast Efficiency**: Logs only sent to connected clients in group
4. **Message Size**: Keep log messages under 2KB for optimal performance

## Troubleshooting

### Logs Not Appearing
1. Check WebSocket connection: `ws.readyState === 1`
2. Verify stream_id is returned from API: `data.stream_id`
3. Verify backend is emitting logs: Check Django logs for `emit_analysis_log` calls
4. Ensure Channels is configured: Check `settings.py` INSTALLED_APPS

### WebSocket Connection Failed
1. Verify Daphne is running (not Django development server alone)
2. Check firewall allows WebSocket connections
3. Verify WS URL format: `ws://` (not `http://`)

### Logs Appearing but Not Updating
1. Check `isAnalyzing` state in frontend
2. Verify `useBackendLogs` has `enabled={true}`
3. Check browser console for JavaScript errors

## Future Enhancements

1. **Filtering**: Show only pipeline or command logs
2. **Search**: Full-text search through logs
3. **Export**: Download logs as JSON or plain text
4. **Replay**: Replay analysis with logs in real-time
5. **Alerts**: Trigger notifications on error logs
6. **Analytics**: Track log frequency and patterns

