# Scanning Dashboard - Visual Layout Reference

## Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      Scanning Dashboard                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────────┐
│  RECENT SCANS (Left Column)  │ LIVE TERMINAL (Right Column)     │
│  ─────────────────────────   │ ──────────────────────────────   │
│                              │                                  │
│  🕐 Recent Scans             │  📺 Live Terminal  ⏹️ Stop      │
│                              │                                  │
│  ✓ https://example.com/1     │  $ Scanning: https://.../1      │
│    Completed                 │  ✓ Connected to backend          │
│    FAKE  87%                 │  $ Fetching article...           │
│    1 min ago                 │  ✓ Content extracted            │
│                              │  $ Running analysis...           │
│  ✓ https://example.com/2     │  ✓ Verification complete ▌      │
│    Completed                 │                                  │
│    REAL  92%                 │  [Auto-scrolls with new output]  │
│    5 min ago                 │                                  │
│                              │  Typing animation effect         │
│  ↻ https://example.com/3     │  Color-coded message types       │
│    In Progress               │                                  │
│    – min ago                 │                                  │
│                              │                                  │
│  ⚠️ https://example.com/4    │                                  │
│    Failed                    │                                  │
│    UNCERTAIN  45%            │                                  │
│    2 hours ago               │                                  │
│                              │                                  │
│  [Scroll for more...]        │  [Scroll for more...]            │
│  ──────────────────────      │  ──────────────────────          │
│  🗑️ Clear History            │                                  │
│                              │                                  │
└──────────────────────────────┴──────────────────────────────────┘
        50% width (lg)               50% width (lg)

Full width on mobile devices with stacked layout

```

## Responsive Behavior

### Desktop (lg screens - 1024px+)
- Grid layout: 2 columns of equal width
- Side-by-side viewing of history and terminal
- Height: 400-500px for each section

### Tablet (md screens - 768px+)
- May use 2 columns depending on orientation
- Slightly reduced height

### Mobile (sm screens - <768px)
- Single column layout
- Full width sections
- Stack vertically

## Color Scheme

### Terminal Output Colors
```
$ Log message           → Blue (#3b82f6)
✓ Success message       → Green (#22c55e)
⚠️ Warning message      → Yellow (#eab308)
✗ Error message         → Red (#ef4444)
```

### Status Indicators
```
✓ Completed    → Success color (green)
✗ Failed       → Destructive color (red)
↻ In Progress  → Secondary color (blue)
```

### Verdict Badges
```
REAL       → Green background with border
FAKE       → Red background with border
UNCERTAIN  → Yellow background with border
```

## Animation Details

### Terminal Typing Animation
- **Speed**: 50ms per character (adjustable)
- **Effect**: Characters appear one by one
- **Cursor**: Blinking animation while scanning

### Status Indicators
- **In Progress**: Rotating icon (2s duration)
- **Live Indicator**: Pulsing dot and text
- **Scan Items**: Fade-in animation on addition

### Transitions
- **Header**: Fade and slide in (0.4s)
- **Recent Scans Column**: Slide from left (0.4s)
- **Terminal Column**: Slide from right (0.4s + 0.1s delay)
- **Current Scan Info**: Fade and slide up (on scanning start)

## Data Flow

```
User Input
    ↓
startScanning(url)
    ↓
Connect to Backend (WebSocket/API)
    ↓
Backend sends terminal output
    ↓
addTerminalOutput(text, type)
    ↓
Store in terminalOutput state
    ↓
Component renders with animation
    ↓
Auto-scroll to latest output
    ↓
User sees real-time updates
    ↓ (when complete)
addScanResult(scanData)
    ↓
Store in existingScans
    ↓
Save to localStorage
    ↓
Display in Recent Scans column
```

## Terminal Output Messages

### Connection Phase
```
$ Scanning: https://example.com/article-1
$ Connecting to analysis service...
✓ Connected to backend
```

### Processing Phase
```
$ Fetching article content...
✓ Content extracted successfully
$ Running feature extraction...
$ Connecting to Ollama service...
$ Generating embeddings...
```

### Analysis Phase
```
$ Running verification pipeline...
$ Checking source credibility...
$ Analyzing writing patterns...
$ Calculating confidence scores...
```

### Completion Phase
```
✓ Analysis complete!
$ Generating report...
✓ Scan finished successfully
```

### Error Scenarios
```
✗ Failed to connect to backend
⚠️ Timeout waiting for response
✗ Error: Invalid article URL
⚠️ Analysis interrupted by user
```

## Customization Options

### Modify Typing Speed
File: `components/ScanningDashboard.tsx` (line ~67)
```typescript
// Change this value to adjust typing speed (in milliseconds)
const timer = setTimeout(() => {
  setDisplayedOutput(terminalOutput.slice(0, displayedOutput.length + 1));
}, 50); // ← Adjust here (lower = faster)
```

### Adjust Terminal Height
```typescript
// In Terminal section height classes:
className="h-[400px] md:h-[500px]" // ← Change these values
```

### Modify Colors
- Update Tailwind classes in component
- Use theme color variables from `theme` configuration
- Examples: `text-secondary`, `bg-destructive/10`, `border-success/30`

### Change Animation Duration
- Framer Motion `transition` props control animation timing
- Example: `transition={{ duration: 0.4 }}` (in seconds)

## User Interactions

### Start Scanning
1. Enter URL in input field
2. Click "Start Scan" button or press Enter
3. Dashboard activates and shows terminal
4. Existing scans list updates after completion

### Stop Scanning
1. Click "Stop" button in terminal header
2. Current scan cancels
3. Frontend stops listening for updates

### Clear History
1. Click "Clear History" button at bottom of Recent Scans
2. Removes all scans from display
3. Clears localStorage

### Manual Terminal Scroll
1. User scrolls up in terminal
2. Auto-scroll disabled temporarily
3. Scroll down to latest to re-enable auto-scroll

## Performance Considerations

- Limits stored scans to 50 most recent (configurable)
- React.memo can be added for optimization
- useCallback prevents unnecessary re-renders
- Terminal scroll virtualization optional for 1000+ outputs

## Browser Compatibility

- Chrome/Edge: ✓ Full support
- Firefox: ✓ Full support
- Safari: ✓ Full support
- IE11: ✗ Not supported (uses modern CSS/JS features)

## Accessibility Features

- Semantic HTML structure
- ARIA labels on buttons
- Color contrast meets WCAG standards
- Keyboard navigation support (Enter to scan, Tab between elements)
- Screen reader friendly terminal output
