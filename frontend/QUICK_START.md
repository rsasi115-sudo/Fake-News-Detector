# Scanning Dashboard - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: View the Component (Right Now!)

1. Start the frontend:
```bash
cd frontend
npm run dev
```

2. Open your browser and visit:
```
http://localhost:5173/scanning
```

3. You should see:
   - **Left side**: "Recent Scans" panel (empty at first)
   - **Right side**: "Live Terminal" panel with example UI
   - **Input field**: Ready to enter URLs

### Step 2: Test with Simulated Data

The `/scanning` page has a built-in simulator! Try it:

1. Enter a URL: `https://example.com/article`
2. Click "Start Scan"
3. Watch the terminal output appear with animation
4. See the scan complete and appear in "Recent Scans"

The simulated process takes ~10 seconds and shows realistic steps.

### Step 3: Integrate into Your Existing Page

Want to use it in your main app? Easy!

**Option A: Add to HeroSection**

```typescript
// In your page component
import ScanningDashboard from "@/components/ScanningDashboard";
import { useScanningDashboard } from "@/hooks/useScanningDashboard";

export function YourComponent() {
  const dashboard = useScanningDashboard();
  
  return (
    <div>
      {/* Your existing content */}
      
      {/* Add the dashboard */}
      <ScanningDashboard
        isScanning={dashboard.isScanning}
        terminalOutput={dashboard.terminalOutput}
        existingScans={dashboard.existingScans}
        currentUrl={dashboard.currentUrl}
        onClear={dashboard.clearHistory}
        onStopScanning={dashboard.stopScanning}
      />
    </div>
  );
}
```

**Option B: Full Page (What We Created)**

Just visit: `/scanning` - it's ready to use!

### Step 4: Connect to Real Backend

When ready to connect your Django analysis:

1. **Read**: `BACKEND_WEBSOCKET_INTEGRATION.md`
2. **Follow**: Instructions for WebSocket setup
3. **Update**: `ScanningPage.tsx` with your API endpoint
4. **Done!**: Real-time terminal output will flow to frontend

## 📊 What You're Getting

### Two-Column Layout
```
┌─────────────────────────┬─────────────────────────┐
│   Recent Scans (Left)   │  Live Terminal (Right)  │
├─────────────────────────┼─────────────────────────┤
│ ✓ URL 1                 │ $ Starting scan...      │
│ ✓ URL 2                 │ ✓ Connected            │
│ ↻ URL 3                 │ $ Running analysis...  │
│ ✗ URL 4                 │ ▌ (cursor animating)   │
└─────────────────────────┴─────────────────────────┘
```

### Terminal Animation
- Character appears one by one (typing effect)
- Color-coded messages:
  - 🔵 Blue = log messages
  - 🟢 Green = success
  - 🟡 Yellow = warnings  
  - 🔴 Red = errors
- Blinking cursor while active

### Scan History
- Shows last 50 scans
- Verdict badges (Real/Fake/Uncertain)
- Confidence percentage
- Time of scan
- Automatically saves to localStorage

## 🎯 Component Structure

```
ScanningDashboard.tsx (Main Component)
├── Left Column: Recent Scans
│   ├── Header with icon
│   ├── Scrollable scan list
│   └── Clear history button
└── Right Column: Live Terminal
    ├── Header with stop button
    ├── Terminal output area
    │   ├── Terminal logs (animated)
    │   └── Blinking cursor
    └── Current scan info
```

## 📝 Files Created

| File | Purpose |
|------|---------|
| `components/ScanningDashboard.tsx` | Main dashboard UI |
| `hooks/useScanningDashboard.ts` | State management |
| `pages/ScanningPage.tsx` | Example page + simulator |
| `SCANNING_DASHBOARD_GUIDE.md` | Full integration docs |
| `BACKEND_WEBSOCKET_INTEGRATION.md` | Django backend setup |
| `SCANNING_DASHBOARD_VISUAL_REFERENCE.md` | Design details |
| `SCANNING_IMPLEMENTATION_SUMMARY.md` | What was built |

## 🔧 Customization Quick Tips

### Change Typing Speed
File: `components/ScanningDashboard.tsx` line 67
```typescript
}, 50); // Change this: lower = faster, higher = slower
```

### Change Terminal Height
File: `components/ScanningDashboard.tsx` line 215
```typescript
className="h-[400px] md:h-[500px]" // Change these values
```

### Change Colors
Replace Tailwind classes:
```typescript
// Blue -> Green
text-secondary → text-success

// Terminal -> Error color
text-blue-400 → text-red-400
```

## 🎨 Animations

All animations use Framer Motion:
- ✨ Smooth transitions
- 🔄 Rotating icons while scanning
- 💫 Pulsing "Live" indicator
- ⌨️ Typing effect
- ✓ Check mark pop-in

## 📱 Responsive Design

- **Mobile**: Single column, full width
- **Tablet**: 2 columns, smaller text
- **Desktop**: 2 equal columns, full size

## 🔌 Next: Connect to Backend

When you want real data:

1. Look at `ScanningPage.tsx` lines 85-120
2. Replace the simulator with real backend call
3. Use WebSocket to stream terminal output
4. Follow `BACKEND_WEBSOCKET_INTEGRATION.md` for Django code

Example structure:
```typescript
// Send scan request
fetch('/api/analyze', { method: 'POST', body: JSON.stringify({url}) })

// Connect WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/api/scan/stream/')

// Receive updates
ws.onmessage = (event) => {
  const {text, type} = JSON.parse(event.data);
  addTerminalOutput(text, type);
}
```

## ✅ Checklist

- [x] Component created and styled
- [x] Animations working
- [x] History persistence implemented
- [x] Simulator ready for testing
- [x] Route added to App.tsx
- [x] Documentation complete
- [ ] Connect to real backend (you do this)
- [ ] Deploy to production

## 🐛 Troubleshooting

**Page shows blank?**
- Check console for errors
- Ensure npm packages installed: `npm install`
- Clear browser cache: Ctrl+Shift+Delete

**Animations not smooth?**
- Browser might be under load
- Try closing other tabs
- Check GPU acceleration in DevTools

**History not saving?**
- Open DevTools > Application > Local Storage
- Check `scan_history` key
- If missing, localStorage might be disabled

**Terminal not scrolling?**
- Auto-scroll is smart - scroll down to re-enable
- Or check `terminalRef.current` in console

## 📚 Learn More

- Detailed frontend guide: `SCANNING_DASHBOARD_GUIDE.md`
- Backend integration: `BACKEND_WEBSOCKET_INTEGRATION.md`
- Visual reference: `SCANNING_DASHBOARD_VISUAL_REFERENCE.md`
- Implementation details: `SCANNING_IMPLEMENTATION_SUMMARY.md`

## 💡 Pro Tips

1. **Test offline**: Simulator works without backend
2. **localStorage**: Scans persist even after page refresh
3. **Reusable hook**: Use `useScanningDashboard` in multiple pages
4. **Accessible**: Keyboard nav (Enter to scan, Tab between elements)
5. **Mobile**: Responsive design works great on phones

## 🚀 You're Ready!

```bash
cd frontend
npm run dev
# Visit: http://localhost:5173/scanning
```

See the dashboard running now? Perfect! It's live and ready.

### What to do next:

1. **Explore** the dashboard at `/scanning`
2. **Test** the simulator by entering a URL
3. **Read** the integration guides for backend connection
4. **Customize** colors and animations as needed
5. **Connect** to your Django analysis API

---

**Questions?** Check the detailed documentation files or look at `ScanningPage.tsx` for implementation examples.

**Ready for production?** See backend integration guide for WebSocket setup.
