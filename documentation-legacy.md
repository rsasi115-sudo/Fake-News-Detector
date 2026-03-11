# TruthLens — Technical Documentation

> AI-Powered Fake News Detection Platform  
> Last updated: 2026-02-09

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Application Architecture](#3-application-architecture)
4. [Routing & Navigation](#4-routing--navigation)
5. [Authentication System](#5-authentication-system)
6. [Core Features](#6-core-features)
7. [Component Reference](#7-component-reference)
8. [State Management](#8-state-management)
9. [Data Models & TypeScript Types](#9-data-models--typescript-types)
10. [Verification Pipeline](#10-verification-pipeline)
11. [UI/UX Design System](#11-uiux-design-system)
12. [Workflows](#12-workflows)
13. [File Structure](#13-file-structure)

---

## 1. Project Overview

**TruthLens** is a single-page web application for detecting fake news and misinformation. Users submit news content (text, URL, or media) and receive an AI-generated credibility report including a verdict, source verification, and detailed analysis scores.

### Key Capabilities

- Real-time news article credibility analysis
- Five-step verification pipeline (Search → Verify → Cross-reference → AI Analysis → Compile)
- Credibility scoring with verdicts: **Real**, **Fake**, **Misleading**, **Unverified**
- Source verification against 10 trusted Indian and international outlets
- AI analysis of language patterns, claim consistency, emotional tone, and credibility indicators
- Search history with localStorage persistence (up to 10 items)
- Multi-modal input: text, URL, image, video, audio, camera
- Downloadable and shareable reports
- Light/dark theme support
- Mobile-responsive design with hamburger navigation

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + tailwindcss-animate |
| UI Components | shadcn/ui (Radix UI primitives, 40+ components) |
| Animations | Framer Motion |
| Routing | React Router DOM v6 |
| State | React Context API + useState/useCallback hooks |
| Persistence | localStorage |
| Charts | Recharts (Bar, Pie, Radar, Line) |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Toast Notifications | Sonner + Radix Toast |
| Data Fetching | TanStack React Query (configured, not actively used with backend) |

---

## 3. Application Architecture

```
┌─────────────────────────────────────────────────┐
│                    App.tsx                       │
│  QueryClientProvider → TooltipProvider →        │
│  AuthProvider → SearchHistoryProvider →          │
│  BrowserRouter                                  │
├─────────────────────────────────────────────────┤
│  Routes:                                        │
│    /           → Landing (public)               │
│    /auth       → Auth (public)                  │
│    /analyze    → MainApp (protected)            │
│    /results    → AnalysisResults (standalone)    │
│    /report     → DetailedReport (standalone)     │
│    /settings   → Settings (authenticated)       │
│    *           → NotFound                       │
└─────────────────────────────────────────────────┘
```

### Provider Hierarchy

1. **QueryClientProvider** — TanStack Query client (infrastructure-ready for future API integration)
2. **TooltipProvider** — Global tooltip context for shadcn/ui
3. **AuthProvider** — Authentication state (login/logout, localStorage-backed)
4. **SearchHistoryProvider** — Search history state (last 10 items, localStorage-backed)

---

## 4. Routing & Navigation

### Route Definitions

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | `Landing` | Public | Minimal hero page with "Get Started" CTA |
| `/auth` | `Auth` | Public | Sign-up / Sign-in form (mobile number + password) |
| `/analyze` | `MainApp` | Protected | Full dashboard with analysis tools and all content sections |
| `/results` | `AnalysisResults` | Public | Standalone results page (uses independent mock data) |
| `/report` | `DetailedReport` | Public | Detailed report with charts (uses independent mock data) |
| `/settings` | `Settings` | Authenticated | Language, theme, notifications, logout |
| `*` | `NotFound` | Public | 404 fallback |

### Navigation Behavior

- **Landing page (`/`)**: Displays only the TruthLens logo and a single "Get Started" button that navigates to `/auth`. No header nav, no footer, no content sections.
- **Header nav links** (`How it Works`, `Features`, `About`): Use in-page smooth scrolling via `document.querySelector(href).scrollIntoView({ behavior: "smooth" })`. URL remains `/analyze`. No route changes occur.
- **"+ New Analysis" button**: Stays on `/analyze`, resets analysis state, clears input, scrolls to hero section, auto-focuses the search input.
- **History item click**: Navigates to `/analyze` if not already there, pre-fills query, and auto-triggers the analysis pipeline or displays cached results instantly.
- **Logout**: Clears auth state and redirects to `/` (landing page).
- **Settings icon**: Navigates to `/settings` page.

### Section Anchor IDs

| Nav Link | Target Section ID | Component |
|----------|------------------|-----------|
| How it Works | `#how-it-works` | `HowItWorks.tsx` |
| Features | `#features` | `Features.tsx` |
| About | `#about` | `AboutSection.tsx` |

---

## 5. Authentication System

### Implementation (`AuthContext.tsx`)

- **Storage**: `localStorage` key `truthlens_auth` stores `"true"` when authenticated.
- **State**: `isAuthenticated` (boolean), `isLoading` (boolean — true until localStorage check completes on mount).
- **Methods**:
  - `login()` — Sets `isAuthenticated = true`, persists to localStorage.
  - `logout()` — Sets `isAuthenticated = false`, removes localStorage key.

### Auth Page (`Auth.tsx`)

- Toggle between **Sign In** and **Sign Up** modes.
- Form fields: Mobile Number (10-digit validation), Password (6+ chars), Confirm Password (sign-up only).
- Password visibility toggle.
- Simulated authentication with 1.5s delay (no real backend).
- Already authenticated users visiting `/auth` are auto-redirected to `/analyze`.

### Route Protection

`MainApp` (`/analyze`) checks `isAuthenticated` on mount via `useEffect`. If `false` (and not loading), redirects to `/auth`. Shows a spinner while auth state is loading.

---

## 6. Core Features

### 6.1 News Analysis Input

**Component**: `HeroSection.tsx`

- **Text input**: Free-form text or URL paste with search icon.
- **Multi-modal options** via `AnalyzeOptionsPopover`:
  - Camera capture (placeholder toast)
  - Image upload (native file picker, `image/*`)
  - Video upload (native file picker, `video/*`)
  - Audio upload (native file picker, `audio/*`)
  - Paste link (browser `prompt()` dialog)
- **Keyboard shortcut**: `Enter` key triggers analysis.
- **"Analyze Now" button**: Disabled when input is empty. Uses `hero` variant styling.
- **Cancel button**: Appears during analysis to abort.
- **Trust stats**: Displayed when idle (99.2% accuracy, 10M+ articles, <45s time).

### 6.2 Verification Pipeline

**Hook**: `useNewsAnalysis.ts`

A five-step simulated verification process with timed delays:

| Step | ID | Duration | Activities |
|------|----|----------|------------|
| 1 | `search` | ~8s | Query news databases, scan TOI/Hindu/NDTV, check wire services |
| 2 | `verify` | ~5.5s | Compare headlines, analyze consistency, generate source results |
| 3 | `crossref` | ~5s | Query Alt News, check Boom Live and AFP archives |
| 4 | `analyze` | ~8.5s | NLP language patterns, emotional tone, claim consistency |
| 5 | `compile` | ~2s | Generate final verification report |

Each step transitions through statuses: `pending` → `active` → `completed` (or `error`). Status details update in real-time during the `active` phase.

### 6.3 Credibility Report

**Component**: `FullReportSection.tsx`

Displayed inline on `/analyze` after analysis completes. Vertically-stacked card layout:

1. **Verdict Header Card**: Icon, label, credibility percentage badge, description, action buttons (Download, Share, Check Another, Re-run), quick stats (sources checked/confirming/disputing)
2. **Summary Card**: Narrative explanation of the verdict
3. **Sources Checked Card**: Cross-platform consistency bar, list of trusted sources with match scores, report types (confirms/disputes/related/not found), and snippets
4. **AI Analysis Card**: 2×2 grid of score cards — Language Patterns, Claim Consistency, Emotional Tone (with detected tone label), Credibility Indicators. Each has progress bar and findings list.
5. **Recommendations Card**: Numbered actionable advice items
6. **Bottom Actions**: "Check Another Article" button

### 6.4 Report Actions

- **Download**: Generates a `.txt` file with report summary, verdict, scores, and recommendations. Uses `Blob` + `URL.createObjectURL` for client-side download.
- **Share**: Uses `navigator.share()` Web Share API on supported devices, falls back to `navigator.clipboard.writeText()`.
- **Check Another**: Resets all analysis state, shows input form.
- **Re-run**: Re-analyzes the same query, creates a new history entry.

### 6.5 Search History

**Context**: `SearchHistoryContext.tsx`

- Stores up to **10 most recent** searches (oldest dropped on overflow).
- Each item contains: `id` (timestamp-based), `query`, `timestamp`, `type` (url/text), optional `result`.
- Persisted to `localStorage` under key `truthlens_search_history`.
- Timestamps serialized as ISO strings for storage, deserialized to `Date` objects on load.
- History results are updated after analysis completes via `updateHistoryResult()`.
- `selectedHistoryItem` state enables cross-component communication for history recall.
- `newAnalysisRequested` flag signals the dashboard to reset for new analysis.

**UI**: `RecentSearchesPanel.tsx` — Popover accessible from the History icon in the header.
- Badge shows history count.
- Each item shows: shortened query, relative timestamp ("2m ago"), verdict icon (if result exists), credibility score.
- Items without cached results show "Click to re-analyze".
- "Clear History" button at bottom.

### 6.6 Real-Time News Feed

**Component**: `RealTimeNews.tsx`

- 6 static mock news items across categories: politics, sports, entertainment, economy, health.
- Category filter tabs with icons (All News, Politics, Sports, Entertainment, Economy, Health).
- Cards show: category badge, title, source, timestamp, "Read More" button.
- Informational only — no direct "Check Credibility" action from news cards.

### 6.7 Dashboard Metrics

**Component**: `DashboardMetrics.tsx`

Static platform statistics displayed in 3-column card grid:
- 99.2% Detection Accuracy (Target icon, success color)
- 10M+ Total Articles Analyzed (FileText icon, secondary color)
- < 30s Average Analysis Time (Clock icon, accent color)

### 6.8 Settings Page

**Page**: `Settings.tsx`

Four settings cards:
- **Language**: English / Tamil toggle (UI state only, no i18n implementation)
- **Notifications**: Push notification toggle with Switch component (UI state only)
- **Appearance**: Light / Dark mode toggle (adds/removes `dark` class on `document.documentElement`)
- **Account**: Logout button (calls `AuthContext.logout()`, redirects to `/`)

### 6.9 Detailed Report Page (Standalone)

**Page**: `DetailedReport.tsx`

Standalone page at `/report` with independent mock data. Features 5 tabbed views:
1. **Text Analysis**: Sentence-level analysis with color-coded highlights (sensational, unverified, questionable, vague, exaggerated, emotional, neutral)
2. **Bias Detection**: Bias indicators with progress bars + Credibility Radar chart (Recharts RadarChart)
3. **Historical**: Historical claim comparison table + frequency bar chart
4. **Source Check**: Source credibility scores + verification results
5. **Analytics**: Confidence distribution pie chart, verification timeline, additional charts

### 6.10 Analysis Results Page (Standalone)

**Page**: `AnalysisResults.tsx`

Standalone page at `/results` with independent mock data. Two-column layout:
- **Main column**: Verdict card, AI explanation, key detection signals (6 metrics with progress bars), source verification
- **Sidebar**: Action buttons (Check Another, View Detailed Report, Download, Share), Learn More card

### 6.11 Sharing

**Component**: `ShareDropdown.tsx`

Dropdown menu with three options:
- WhatsApp share (opens `wa.me` link with encoded text)
- Email share (opens `mailto:` link with subject and body)
- Copy link to clipboard (with visual "Copied!" confirmation)

---

## 7. Component Reference

### Layout Components

| Component | File | Description |
|-----------|------|-------------|
| `Header` | `Header.tsx` | Fixed top nav with glass-morphism, logo, nav links (smooth scroll), history panel, settings icon, mobile hamburger menu with AnimatePresence |
| `Footer` | `Footer.tsx` | Site footer with logo, social links (Twitter/GitHub/LinkedIn), Product/Resources/Company/Legal link columns |
| `Logo` | `Logo.tsx` | TruthLens brand mark — gradient rounded icon with BrainCircuit + small Sparkles indicator badge |

### Page Components

| Component | File | Description |
|-----------|------|-------------|
| `Landing` | `pages/Landing.tsx` | Minimal entry page with hero background image overlay and "Get Started" CTA |
| `MainApp` | `pages/MainApp.tsx` | Protected dashboard assembling Header + HeroSection + DashboardMetrics + RealTimeNews + HowItWorks + Features + AboutSection + Footer |
| `Auth` | `pages/Auth.tsx` | Sign-in/Sign-up form with mobile number + password, toggle between modes |
| `AnalysisResults` | `pages/AnalysisResults.tsx` | Standalone results page with mock data (not connected to main analysis flow) |
| `DetailedReport` | `pages/DetailedReport.tsx` | Full detailed report with Recharts visualizations (not connected to main analysis flow) |
| `Settings` | `pages/Settings.tsx` | User preferences page with language, notifications, theme, logout |
| `NotFound` | `pages/NotFound.tsx` | 404 page |

### Feature Components

| Component | File | Description |
|-----------|------|-------------|
| `HeroSection` | `HeroSection.tsx` | Main analysis input with animated gradient background, neural network dots, verification progress integration, and inline report display |
| `VerificationProgress` | `VerificationProgress.tsx` | Animated 5-step verification progress card with pulsing indicators, status transitions, and overall progress bar |
| `FullReportSection` | `FullReportSection.tsx` | Complete vertically-stacked credibility report with verdict, stats, summary, sources, AI analysis, and recommendations |
| `AnalysisResultCard` | `AnalysisResultCard.tsx` | Compact tabbed result card (Summary/Sources/Analysis) — exists but not actively used in current flow |
| `AnalyzeOptionsPopover` | `AnalyzeOptionsPopover.tsx` | Multi-modal input popover with camera, image, video, audio, and link options |
| `RecentSearchesPanel` | `RecentSearchesPanel.tsx` | History popover with recent searches, verdict indicators, "+ New Analysis" button, and clear history |
| `ShareDropdown` | `ShareDropdown.tsx` | WhatsApp, Email, Copy Link sharing dropdown menu |
| `SettingsDropdown` | `SettingsDropdown.tsx` | Quick settings dropdown with profile, theme, language, notifications — exists but not actively used in current header |

### Section Components (Dashboard)

| Component | File | Section ID | Description |
|-----------|------|------------|-------------|
| `DashboardMetrics` | `DashboardMetrics.tsx` | — | Platform statistics cards (3 metrics) |
| `RealTimeNews` | `RealTimeNews.tsx` | — | News feed with category filter tabs (6 items) |
| `HowItWorks` | `HowItWorks.tsx` | `#how-it-works` | Four-step process explanation with connector lines |
| `Features` | `Features.tsx` | `#features` | Eight feature cards in responsive grid |
| `AboutSection` | `AboutSection.tsx` | `#about` | Mission, 6 analysis capabilities, 6 benefits, 3 target user groups |

### Utility Components

| Component | File | Description |
|-----------|------|-------------|
| `NavLink` | `NavLink.tsx` | Wrapper around React Router's NavLink with `className`/`activeClassName` support |
| `ui/*` | `components/ui/` | shadcn/ui component library (accordion, alert, avatar, badge, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip) |

---

## 8. State Management

### Global State (React Context)

#### AuthContext (`contexts/AuthContext.tsx`)
```typescript
interface AuthContextType {
  isAuthenticated: boolean;  // Current auth state
  isLoading: boolean;        // True until localStorage is checked on mount
  login: () => void;         // Set authenticated + persist to localStorage
  logout: () => void;        // Clear auth + remove from localStorage
}
```
**Storage key**: `truthlens_auth`

#### SearchHistoryContext (`contexts/SearchHistoryContext.tsx`)
```typescript
interface SearchHistoryContextType {
  history: SearchHistoryItem[];                                    // Array of past searches (max 10)
  addToHistory: (query: string, result?: AnalysisResult) => string; // Add entry, returns ID
  updateHistoryResult: (id: string, result: AnalysisResult) => void; // Attach result to existing entry
  clearHistory: () => void;                                        // Clear all history
  selectedHistoryItem: SearchHistoryItem | null;                   // Item selected from history panel
  setSelectedHistoryItem: (item: SearchHistoryItem | null) => void;
  getHistoryItemById: (id: string) => SearchHistoryItem | undefined;
  newAnalysisRequested: boolean;                                   // Flag: "+ New Analysis" clicked
  setNewAnalysisRequested: (val: boolean) => void;
}
```
**Storage key**: `truthlens_search_history`

### Local State (Component-level)

| Component | State Variables | Purpose |
|-----------|----------------|---------|
| `HeroSection` | `inputValue`, `currentQuery` | Search input and active query tracking |
| `HeroSection` | `currentHistoryIdRef` | Ref linking current analysis to history entry |
| `useNewsAnalysis` | `AnalysisState` | isAnalyzing, currentStep, steps[], result, error |
| `Settings` | `language`, `notifications`, `theme` | User preferences (component-local, not persisted except theme via DOM class) |
| `RealTimeNews` | `activeCategory` | Selected news category filter |
| `Auth` | `isSignUp`, `showPassword`, `isLoading`, `formData` | Form state management |
| `Header` | `mobileMenuOpen` | Mobile hamburger menu toggle |
| `RecentSearchesPanel` | `isOpen` | Popover open state |
| `AnalyzeOptionsPopover` | `isOpen` | Popover open state |
| `ShareDropdown` | `copied` | Clipboard copy confirmation state |

---

## 9. Data Models & TypeScript Types

### VerificationStep
```typescript
type VerificationStep = {
  id: string;              // "search" | "verify" | "crossref" | "analyze" | "compile"
  label: string;           // Human-readable step name
  status: "pending" | "active" | "completed" | "error";
  details?: string;        // Current status message (updates during "active")
  sources?: TrustedSource[]; // Populated during "verify" step
};
```

### TrustedSource
```typescript
type TrustedSource = {
  name: string;            // e.g., "Times of India"
  url: string;             // Generated URL from source name
  found: boolean;          // Whether source had coverage (~70% chance)
  matchScore: number;      // 0-100 match percentage (0 if not found)
  reportType: "confirms" | "disputes" | "unrelated" | "not_found";
  snippet?: string;        // Excerpt snippet (only if found)
};
```

### AnalysisResult
```typescript
type AnalysisResult = {
  verdict: "real" | "fake" | "misleading" | "unverified";
  credibilityScore: number;  // 0-100 (average of all scores)
  sourceVerification: {
    totalSourcesChecked: number;     // 5-8 sources
    confirmingSources: number;
    disputingSources: number;
    crossPlatformConsistency: number; // 0-100 (confirming/total ratio)
    trustedSources: TrustedSource[];
  };
  aiAnalysis: {
    languagePatterns:      { score: number; findings: string[] };
    claimConsistency:      { score: number; findings: string[] };
    emotionalTone:         { score: number; tone: string; findings: string[] };
    credibilityIndicators: { score: number; findings: string[] };
  };
  summary: string;           // Generated narrative summary
  recommendations: string[]; // 4-5 actionable recommendations
};
```

### SearchHistoryItem
```typescript
interface SearchHistoryItem {
  id: string;          // Timestamp-based ID (Date.now().toString())
  query: string;       // User's input text/URL
  timestamp: Date;     // When the search was performed
  type: "url" | "text"; // Determined by http:// or https:// prefix
  result?: AnalysisResult; // Cached result (attached after analysis completes)
}
```

### AnalysisState
```typescript
type AnalysisState = {
  isAnalyzing: boolean;          // Whether pipeline is running
  currentStep: number;           // Index of active step (0-4)
  steps: VerificationStep[];     // All 5 verification steps
  result: AnalysisResult | null; // Final result (null until complete)
  error: string | null;          // Error message if pipeline fails
};
```

---

## 10. Verification Pipeline

### Pipeline Flow

```
User Input (text/URL)
    │
    ▼
┌──────────────────────────────┐
│ Step 1: SEARCH                │  ~8 seconds
│ "Searching trusted sources"   │  - Query major news databases
│                               │  - Scan TOI, The Hindu, NDTV
│                               │  - Check international wire services
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ Step 2: VERIFY                │  ~5.5 seconds
│ "Verifying across outlets"    │  - Compare headlines and content
│                               │  - Analyze source consistency
│                               │  - Generate 5-8 source results
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ Step 3: CROSS-REFERENCE       │  ~5 seconds
│ "Cross-referencing databases" │  - Query Alt News database
│                               │  - Check Boom Live and AFP archives
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ Step 4: AI ANALYSIS           │  ~8.5 seconds
│ "Analyzing with AI"           │  - NLP language pattern analysis
│                               │  - Emotional tone evaluation
│                               │  - Claim consistency check
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ Step 5: COMPILE               │  ~2 seconds
│ "Compiling report"            │  - Calculate scores
│                               │  - Determine verdict
│                               │  - Generate summary & recommendations
└──────────┬───────────────────┘
           ▼
    AnalysisResult → Rendered in FullReportSection
```

### Verdict Determination Logic

```
avgScore = average(languageScore, claimScore, emotionalScore, credibilityScore, crossPlatformConsistency)

IF disputingSources > confirmingSources OR avgScore < 50  → "fake"
ELSE IF avgScore >= 75 AND confirmingSources >= 2          → "real"
ELSE IF avgScore >= 60 OR disputingSources > 0             → "misleading"
ELSE                                                       → "unverified"
```

### Score Generation

All scores are randomly generated within ranges for demonstration:
- `languageScore`: 60-95
- `claimScore`: 55-95
- `emotionalScore`: 50-95
- `credibilityScore`: 60-95
- `crossPlatformConsistency`: derived from confirming/total source ratio

### Trusted Sources Database

| Source | Category | Used For |
|--------|----------|----------|
| Times of India | National | News verification |
| The Hindu | National | News verification |
| NDTV | National | News verification |
| India Today | National | News verification |
| Reuters India | International | Cross-reference |
| PTI News | Agency | Wire service check |
| Alt News | Fact-check | Fact-check database |
| Boom Live | Fact-check | Fact-check database |
| India Fact Check | Fact-check | Fact-check database |
| AFP Fact Check | Fact-check | Fact-check database |

### Mock Source Results Generation

- 5-8 sources randomly selected from the 10 trusted sources
- Each source has ~70% chance of being "found"
- Found sources are assigned: ~30% "confirms", ~20% "disputes", remainder "unrelated"
- Not-found sources get `reportType: "not_found"` and `matchScore: 0`
- Match scores for found sources: 50-100 (random)

> **Note**: The entire pipeline uses simulated data. No actual API calls, web scraping, or AI model inference occurs.

---

## 11. UI/UX Design System

### Theme & Colors

The app uses HSL-based CSS custom properties defined in `index.css` with full light/dark mode support via the `dark` class on `<html>`.

**Core Semantic Tokens**:

| Token | Purpose |
|-------|---------|
| `--background` / `--foreground` | Base page colors |
| `--primary` / `--primary-foreground` | Primary actions and dark surfaces |
| `--secondary` / `--secondary-foreground` | Brand accent (teal/cyan) — used for CTA, scores, icons |
| `--accent` | Supporting accent color |
| `--muted` / `--muted-foreground` | Subtle backgrounds and secondary text |
| `--destructive` | Error states, "fake" verdict, disputing sources |
| `--success` | Positive states, "real" verdict, confirming sources |
| `--warning` | Caution states, "misleading" verdict |
| `--card` / `--popover` | Surface colors for cards and overlays |
| `--border` / `--ring` | Borders and focus rings |

### Typography

- **Display font**: `font-display` (configured in Tailwind) — used for headings, brand name, large numbers
- **Body text**: Default sans-serif stack

### Custom Utility Classes

| Class | Effect |
|-------|--------|
| `text-gradient` | Gradient text effect (brand accent) |
| `gradient-glass` | Glass morphism background with backdrop blur |
| `gradient-card` | Card with subtle gradient background |
| `shadow-soft` | Soft, diffused elevation shadow |
| `shadow-glow` | Glowing accent-colored shadow |

### Button Variants

- `default` — Primary filled button
- `secondary` — Secondary accent button
- `destructive` — Red destructive action
- `outline` — Bordered transparent button
- `ghost` — Transparent with hover background
- `hero` — Large gradient CTA button with shadow (used for "Get Started", "Analyze Now")
- `link` — Text-only link style

### Animations

- **Framer Motion**: Page transitions (`initial`/`animate`/`exit`), card reveals (`whileInView`), floating elements (`animate` with infinite repeat), verification step transitions, progress bar animations
- **CSS**: `animate-pulse` for live status indicators, `animate-spin` for loading spinners
- **Smooth scrolling**: `scrollIntoView({ behavior: "smooth" })` for in-page navigation
- **AnimatePresence**: Used for conditional rendering transitions (input ↔ progress ↔ results, mobile menu)

### Responsive Design

- Mobile-first approach with Tailwind breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`)
- Mobile hamburger menu in Header (animated open/close with Framer Motion)
- Responsive grid layouts: 1 column (mobile) → 2 columns (tablet) → 3-4 columns (desktop)
- Touch-friendly input sizes (`h-12`, `h-14`)
- Hidden elements on mobile via `hidden sm:inline`, `hidden md:flex`, `hidden lg:flex`

### HeroSection Background

Multi-layered animated background:
1. Base gradient: dark blue to deep purple
2. Animated gradient orbs (3 large blurred circles with `animate-pulse`)
3. Grid pattern overlay (subtle lines at 3% opacity)
4. Neural network dots (20 animated points with random positions)
5. Floating decorative elements (BrainCircuit, Sparkles icons with vertical bobbing animation)

---

## 12. Workflows

### 12.1 First-Time User Flow

```
Landing (/) → Click "Get Started" → Auth (/auth) → Sign Up → MainApp (/analyze)
```

### 12.2 Returning User Flow

```
Landing (/) → Click "Get Started" → Auth (/auth) → Sign In → MainApp (/analyze)
```

### 12.3 News Analysis Flow

```
1. Enter text/URL in search bar (or use multi-modal options)
2. Click "Analyze Now" (or press Enter)
   → Item added to search history (without result)
   → Input form animates out
   → Verification progress card appears with 5 steps
   → Each step shows active details, then completes
3. After all steps complete:
   → Full report renders inline below hero section
   → Auto-scroll to report
   → History item updated with cached result
4. User can: Download, Share, Check Another, or Re-run
```

### 12.4 History Recall Flow

```
1. Click History icon (top-right header)
   → Popover opens showing recent searches (max 10)
2. Click a history item
   → IF cached result exists: Display report instantly (no re-analysis)
   → IF no cached result: Auto-trigger full analysis pipeline
   → Pre-fill search input with saved query
   → Navigate to /analyze if on different page
```

### 12.5 New Analysis Flow

```
1. Click "+ New Analysis" in Recent Searches popover
   → Reset all analysis state (clear result, steps)
   → Clear search input
   → Scroll to hero/search section
   → Auto-focus input field
   → Stay on /analyze
```

### 12.6 Report Actions Flow

```
Download → Generates .txt file with verdict, score, summary, recommendations
Share → navigator.share() on mobile OR clipboard copy on desktop
Check Another → Reset state, show input form
Re-run → Re-analyze same query, create new history entry with fresh results
```

### 12.7 Settings Flow

```
1. Click Settings icon (gear icon, top-right header)
   → Navigate to /settings
2. Available actions:
   → Change language (English/Tamil) — toast confirmation
   → Toggle push notifications — toast confirmation
   → Switch theme (Light/Dark) — immediate visual change
   → Logout → Clear auth → Redirect to / (landing)
```

### 12.8 Theme Switching

```
Settings page → Click Light/Dark button
   → Adds/removes "dark" class on document.documentElement
   → All CSS custom properties switch to dark mode values
   → Toast notification confirms change
```

---

## 13. File Structure

```
src/
├── assets/
│   └── hero-bg.jpg                    # Landing page background image
├── components/
│   ├── ui/                            # shadcn/ui component library (40+ components)
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── alert.tsx
│   │   ├── aspect-ratio.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── carousel.tsx
│   │   ├── chart.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── hover-card.tsx
│   │   ├── input-otp.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── radio-group.tsx
│   │   ├── resizable.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── toggle-group.tsx
│   │   ├── toggle.tsx
│   │   ├── tooltip.tsx
│   │   └── use-toast.ts
│   ├── AboutSection.tsx               # About, mission, capabilities, target users
│   ├── AnalysisResultCard.tsx         # Compact tabbed result card (unused)
│   ├── AnalyzeOptionsPopover.tsx      # Multi-modal input options
│   ├── DashboardMetrics.tsx           # Platform statistics
│   ├── Features.tsx                   # Feature grid (8 items)
│   ├── Footer.tsx                     # Site footer with link columns
│   ├── FullReportSection.tsx          # Full vertically-stacked credibility report
│   ├── Header.tsx                     # Fixed top navigation with smooth scroll
│   ├── HeroSection.tsx                # Main analysis input + progress + results
│   ├── HowItWorks.tsx                 # 4-step process explanation
│   ├── Logo.tsx                       # Brand logo (BrainCircuit + Sparkles)
│   ├── NavLink.tsx                    # React Router NavLink wrapper
│   ├── RealTimeNews.tsx               # News feed with category filters
│   ├── RecentSearchesPanel.tsx        # History popover with search recall
│   ├── SettingsDropdown.tsx           # Quick settings dropdown (unused)
│   ├── ShareDropdown.tsx              # WhatsApp/Email/Copy sharing menu
│   └── VerificationProgress.tsx       # Animated 5-step verification progress
├── contexts/
│   ├── AuthContext.tsx                # Authentication state (localStorage-backed)
│   └── SearchHistoryContext.tsx       # Search history state (localStorage-backed)
├── hooks/
│   ├── use-mobile.tsx                 # Mobile viewport detection hook
│   ├── use-toast.ts                   # Toast notification hook
│   └── useNewsAnalysis.ts             # Core analysis pipeline (types, mock logic, state)
├── lib/
│   └── utils.ts                       # Utility functions (cn class merger)
├── pages/
│   ├── AnalysisResults.tsx            # Standalone results page (mock data, legacy)
│   ├── Auth.tsx                       # Authentication page (sign-in/sign-up)
│   ├── DetailedReport.tsx             # Detailed report with charts (mock data, legacy)
│   ├── Index.tsx                      # Legacy index page
│   ├── Landing.tsx                    # Minimal landing/entry page
│   ├── MainApp.tsx                    # Protected dashboard (all sections)
│   ├── NotFound.tsx                   # 404 page
│   └── Settings.tsx                   # User settings page
├── test/
│   ├── example.test.ts                # Example test file
│   └── setup.ts                       # Vitest test setup
├── App.tsx                            # Root: providers + router configuration
├── App.css                            # Global styles
├── index.css                          # Tailwind base + CSS custom properties
├── main.tsx                           # React DOM entry point
└── vite-env.d.ts                      # Vite type declarations
```

---

## Notes & Caveats

1. **Mock Data Only**: The current implementation uses simulated/mock data for all analysis results. No actual API calls are made to news sources or AI models. The verification pipeline uses `setTimeout` delays to simulate processing time and `Math.random()` for score generation.

2. **No Backend**: The application is entirely client-side. Authentication is simulated via localStorage. There is no server, database, or API integration.

3. **Unused Components**: `AnalysisResultCard.tsx` and `SettingsDropdown.tsx` exist in the codebase but are not actively rendered in the current UI flow.

4. **Legacy Pages**: `AnalysisResults.tsx` (`/results`) and `DetailedReport.tsx` (`/report`) contain independent mock data and are standalone pages not connected to the main analysis flow on `/analyze`. They were part of an earlier multi-page design.

5. **Settings Persistence**: Language and notification preferences are component-local state and reset on page reload. Only the theme (dark mode class) persists via DOM manipulation, and auth state persists via localStorage.

6. **No Real i18n**: The Tamil language option in settings exists as a UI toggle but does not translate any content.
