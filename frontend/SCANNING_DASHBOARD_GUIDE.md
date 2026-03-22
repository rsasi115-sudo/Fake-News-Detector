# Scanning Dashboard Integration Guide

## Overview

The Scanning Dashboard component displays a 2-column layout:
- **Left Column**: Recent scans history with status, verdict, and confidence scores
- **Right Column**: Live terminal output with real-time animation while scanning

## Components Created

### 1. **ScanningDashboard.tsx**
Location: `frontend/src/components/ScanningDashboard.tsx`

Main component for displaying the scanning interface with:
- Two-column responsive grid layout
- Real-time terminal output with typing animation
- Scan history with status indicators
- Live scanning status indicator
- Auto-scrolling terminal

**Props:**
```typescript
interface ScanningDashboardProps {
  isScanning?: boolean;           // Is scan currently active
  terminalOutput?: TerminalOutput[]; // Array of terminal output lines
  existingScans?: ScanResult[];   // Array of past scan results
  currentUrl?: string;             // URL currently being scanned
  onClear?: () => void;           // Clear history callback
  onStopScanning?: () => void;    // Stop scanning callback
}
```

### 2. **useScanningDashboard.ts**
Location: `frontend/src/hooks/useScanningDashboard.ts`

Custom hook to manage scanning state with:
- Scan history persistence (localStorage)
- Terminal output management
- Scanning state management
- Methods: `startScanning`, `stopScanning`, `addTerminalOutput`, `addScanResult`

Usage:
```typescript
const {
  isScanning,
  currentUrl,
  terminalOutput,
  existingScans,
  startScanning,
  stopScanning,
  addTerminalOutput,
  addScanResult,
  clearHistory,
} = useScanningDashboard();
```

### 3. **ScanningPage.tsx**
Location: `frontend/src/pages/ScanningPage.tsx`

Complete page implementation with:
- Input field for URL entry
- Integration with the dashboard
- Simulated backend connection (ready for real WebSocket)
- Example of real-time terminal output

## Quick Start

### 1. Basic Usage in Your Page

```typescript
import ScanningDashboard from "@/components/ScanningDashboard";
import { useScanningDashboard } from "@/hooks/useScanningDashboard";

export function MyPage() {
  const {
    isScanning,
    currentUrl,
    terminalOutput,
    existingScans,
    startScanning,
    stopScanning,
    addTerminalOutput,
    addScanResult,
    clearHistory,
  } = useScanningDashboard();

  return (
    <ScanningDashboard
      isScanning={isScanning}
      terminalOutput={terminalOutput}
      existingScans={existingScans}
      currentUrl={currentUrl}
      onClear={clearHistory}
      onStopScanning={stopScanning}
    />
  );
}
```

### 2. Connect Terminal Output from Backend

**Option A: Via WebSocket**

```typescript
useEffect(() => {
  if (!isScanning) return;

  // Connect to backend WebSocket for real-time updates
  const ws = new WebSocket("ws://YOUR_BACKEND/api/scan/stream");

  ws.onmessage = (event) => {
    const { type, text } = JSON.parse(event.data);
    addTerminalOutput(text, type);
  };

  return () => ws.close();
}, [isScanning]);
```

**Option B: Via API Polling**

```typescript
useEffect(() => {
  if (!isScanning) return;

  const interval = setInterval(async () => {
    const response = await fetch(`/api/scan/status/${currentUrl}`);
    const data = await response.json();
    
    // Process terminal data
    data.logs.forEach(log => {
      addTerminalOutput(log.message, log.level);
    });

    if (data.completed) {
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
  }, 500);

  return () => clearInterval(interval);
}, [isScanning]);
```

### 3. Trigger Backend Scanning

```typescript
const handleStartScan = async () => {
  if (inputUrl.trim()) {
    startScanning(inputUrl);

    // Trigger backend scan
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      });

      if (!response.ok) throw new Error("Failed to start scan");
      
      // Response will contain scan ID for tracking
      const { scanId } = await response.json();
      
      // Now listen for terminal updates
      // Connect WebSocket or start polling here
    } catch (error) {
      addTerminalOutput(`Error: ${error.message}`, "error");
      stopScanning();
    }
  }
};
```

## Features

### ✨ Terminal Animation
- **Typing Effect**: Terminal output appears with smooth typing animation
- **Typing Cursor**: Animated blinking cursor while scanning
- **Color Coding**: Different colors for log, success, error, and warning messages
- **Auto-scroll**: Terminal automatically scrolls to show latest output

### 📊 Scan History
- **Persistent Storage**: Scans saved to localStorage (last 50)
- **Status Icons**: Visual indicators for completed, failed, and in-progress scans
- **Verdict Badges**: Real/Fake/Uncertain verdicts with confidence scores
- **Timestamps**: Shows when each scan was performed
- **Scrollable Area**: Fixed height with scrolling for many scans

### 🎨 Responsive Design
- **Mobile**: Single column layout on small screens
- **Desktop**: Two-column grid on larger screens
- **Animations**: Framer Motion for smooth transitions
- **Backdrop Blur**: Modern glass-morphism design

### 🔧 State Management
- **Local Storage**: Persistent scan history
- **React Hooks**: useState and useCallback for performance
- **Unmount Cleanup**: Proper cleanup for intervals/connections

## Styling

The component uses Tailwind CSS with the project's theme:
- **Colors**: Uses semantic color tokens (primary, secondary, success, destructive, warning)
- **Typography**: Tailwind's font-display and font-mono
- **Responsive**: Grid layout adapts from 1 column (mobile) to 2 columns (desktop)

## Advanced Usage

### Custom Terminal Output Types

```typescript
addTerminalOutput("Processing...", "log");       // Blue
addTerminalOutput("Complete!", "success");       // Green
addTerminalOutput("Warning!", "warning");        // Yellow
addTerminalOutput("Error occurred!", "error");   // Red
```

### Programmatic Scanning

```typescript
// Start scan
startScanning("https://example.com/article");

// Add outputs as they arrive
addTerminalOutput("Connecting to backend...");
addTerminalOutput("Fetching article...");

// Add result when complete
addScanResult({
  id: "scan-123",
  url: "https://example.com/article",
  timestamp: Date.now(),
  status: "completed",
  verdict: "fake",
  confidence: 87.5,
});

// Stop scanning
stopScanning();
```

### Clear History

```typescript
clearHistory(); // Clears all stored scan history
```

## Backend Integration Notes

When connecting to your Django backend:

1. **Streaming Endpoint**: Use Server-Sent Events or WebSocket for live terminal output
2. **Status Logging**: Log detailed steps during analysis to send to frontend
3. **Format Terminal Data**:
   ```json
   {
     "type": "log|success|error|warning",
     "text": "Output message",
     "timestamp": 1234567890
   }
   ```

4. **Completion Response**:
   ```json
   {
     "status": "completed",
     "verdict": "fake|real|uncertain",
     "confidence": 87.5,
     "logs": [...]
   }
   ```

## Troubleshooting

**Terminal not updating?**
- Check if WebSocket/API endpoint is connected
- Verify data format matches TerminalOutput interface
- Check browser console for errors

**History not persisting?**
- Check if localStorage is enabled in browser
- Clear and reload page
- Check browser DevTools Storage > Local Storage

**Animation too fast/slow?**
- Adjust typing speed in ScanningDashboard.tsx (currently 50ms)
- Modify animation transitions in component

## Next Steps

1. ✅ Created ScanningDashboard component
2. ✅ Created useScanningDashboard hook
3. ✅ Added ScanningPage example
4. 👉 Connect to real backend WebSocket/API
5. 👉 Deploy and test with actual scanning process

Visit `/scanning` route to view the dashboard!
