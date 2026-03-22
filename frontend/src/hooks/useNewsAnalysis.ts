import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { clearTokens } from "@/lib/auth";

const STEP_PROGRESS_MS = {
  submit: 4_000,
  preprocess: 8_000,
  extract: 8_000,
  score: 10_000,
  report: 10_000,
} as const;

const STEP_PROGRESS_RANGES = {
  submit: [0, 10],
  preprocess: [10, 30],
  extract: [30, 50],
  score: [50, 75],
  report: [75, 99],
} as const;

const PROGRESS_TICK_MS = 150;

export type VerificationStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  details?: string;
  sources?: TrustedSource[];
};

export type TrustedSource = {
  name: string;
  url: string;
  found: boolean;
  matchScore: number;
  reportType: "confirms" | "disputes" | "not_found";
  snippet?: string;
};

export type ExplainableAI = {
  summary: string;
  reasoning: string[];
  inconsistencies: string[];
  recommendations: string[];
  confidence: number;
};

export type SourceVerificationData = {
  verificationEnabled: boolean;
  verificationStatus: string;
  matchedSources: Array<{
    sourceName: string;
    domain: string;
    similarityScore: number;
    matchedHeadline: string;
    matchedEntities: string[];
    status: string;
    note: string;
    isDomainMatch?: boolean;
  }>;
  perSourceStatuses: Array<{
    sourceName: string;
    status: string;
    note: string;
    similarityScore: number;
  }>;
  contradictionCount: number;
  sourceCount: number;
  verificationNotes: string;
};

export type AnalysisResult = {
  verdict: "real" | "fake" | "misleading";
  credibilityScore: number;
  explainableAI: ExplainableAI | null;
  llmStatus?: string;
  llmError?: string;
  sourceVerificationData: SourceVerificationData;
  sourceVerification: {
    totalSourcesChecked: number;
    confirmingSources: number;
    disputingSources: number;
    crossPlatformConsistency: number;
    trustedSources: TrustedSource[];
  };
  aiAnalysis: {
    languagePatterns: {
      score: number;
      findings: string[];
    };
    claimConsistency: {
      score: number;
      findings: string[];
    };
    emotionalTone: {
      score: number;
      tone: string;
      findings: string[];
    };
    credibilityIndicators: {
      score: number;
      findings: string[];
    };
  };
  summary: string;
  recommendations: string[];
};

export type AnalysisState = {
  isAnalyzing: boolean;
  currentStep: number;
  progressPercent: number;
  steps: VerificationStep[];
  result: AnalysisResult | null;
  error: string | null;
  streamId: string | null;
};

// ── Backend response types ──────────────────────────────────────────────

interface BackendSource {
  id: number;
  source_name: string;
  verification_status: "verified" | "disputed" | "not_found";
  match_percentage: number;
}

interface BackendSourceVerification {
  verification_enabled: boolean;
  verification_status: string;
  matched_sources: Array<{
    source_name: string;
    domain: string;
    status: string;
    note: string;
    similarity_score: number;
    matched_headline: string;
    matched_entities: string[];
    is_domain_match?: boolean;
  }>;
  per_source_statuses?: Array<{
    source_name: string;
    status: string;
    note: string;
    similarity_score: number;
    is_domain_match?: boolean;
  }>;
  contradiction_count?: number;
  source_count: number;
  verification_notes: string;
}

interface BackendResult {
  id: number;
  verdict: "true" | "false" | "misleading";
  credibility_score: number;
  metrics: Record<string, unknown>;
  llm_summary: string;
  explainable_ai: Record<string, unknown> | null;
  llm_provider: string;
  llm_latency_ms: number | null;
  llm_status: string;
  llm_error: string;
  created_at: string;
  sources: BackendSource[];
  source_verification?: BackendSourceVerification;
}

interface BackendAnalysisResponse {
  id: number;
  input_type: string;
  input_value: string;
  created_at: string;
  updated_at: string;
  result: BackendResult;
  stream_id?: string;
}

// ── Mapping helpers ─────────────────────────────────────────────────────

/** Map backend verdict → frontend verdict */
const mapVerdict = (v: string): AnalysisResult["verdict"] => {
  switch (v) {
    case "true":       return "real";
    case "false":      return "fake";
    case "misleading": return "misleading";
    default:           return "misleading";
  }
};

/** Map backend source status → frontend reportType */
const mapReportType = (status: string): TrustedSource["reportType"] => {
  switch (status) {
    case "verified":  return "confirms";
    case "disputed":  return "disputes";
    case "not_found": return "not_found";
    default:          return "not_found";
  }
};

/** Extract the explainable_ai object from the backend, or null if absent/empty */
const extractExplainableAI = (raw: Record<string, unknown> | null): ExplainableAI | null => {
  if (!raw || typeof raw !== "object" || Object.keys(raw).length === 0) return null;
  const ai = raw as Record<string, unknown>;
  return {
    summary: typeof ai.summary === "string" ? ai.summary : "",
    reasoning: Array.isArray(ai.reasoning) ? (ai.reasoning as string[]) : [],
    inconsistencies: Array.isArray(ai.inconsistencies) ? (ai.inconsistencies as string[]) : [],
    recommendations: Array.isArray(ai.recommendations) ? (ai.recommendations as string[]) : [],
    confidence: typeof ai.confidence === "number" ? ai.confidence : 0,
  };
};

/** Convert backend response to the AnalysisResult shape the UI expects */
const mapBackendToAnalysisResult = (data: BackendAnalysisResponse): AnalysisResult => {
  const r = data.result;
  const metrics = r.metrics as Record<string, number | string[] | boolean | unknown>;
  const score = r.credibility_score;

  // Extract real explainable AI from Ollama
  const explainableAI = extractExplainableAI(r.explainable_ai);

  // Map sources
  const trustedSources: TrustedSource[] = (r.sources || []).map((s) => ({
    name: s.source_name,
    url: `https://${s.source_name.toLowerCase().replace(/\s+/g, "")}.com`,
    found: s.verification_status !== "not_found",
    matchScore: s.match_percentage,
    reportType: mapReportType(s.verification_status),
    snippet: s.verification_status === "verified"
      ? "Source corroborates this information."
      : s.verification_status === "disputed"
        ? "Source disputes elements of this claim."
        : undefined,
  }));

  const confirming = trustedSources.filter((s) => s.reportType === "confirms").length;
  const disputing  = trustedSources.filter((s) => s.reportType === "disputes").length;
  const totalFound = trustedSources.filter((s) => s.found).length;
  const consistency = totalFound > 0 ? Math.round((confirming / totalFound) * 100) : 50;

  // Build AI analysis section from metrics (kept for backward compat)
  const clickbait   = (metrics.clickbait_count as number) ?? 0;
  const emotional   = (metrics.emotional_count as number) ?? 0;
  const credibility = (metrics.credibility_count as number) ?? 0;
  const hedge       = (metrics.hedge_count as number) ?? 0;
  const wordCount   = (metrics.word_count as number) ?? 0;

  const languageScore   = Math.min(100, Math.max(0, score + 10 - clickbait * 5));
  const claimScore      = Math.min(100, Math.max(0, score - hedge * 3));
  const emotionalScore  = Math.min(100, Math.max(0, 100 - emotional * 8));
  const credScore       = Math.min(100, Math.max(0, score + credibility * 3));

  const scoringBreakdown = (metrics.scoring_breakdown as Array<{ reason: string }>) ?? [];
  const recommendations  = (metrics.recommendations as string[]) ?? [];

  const languageFindings: string[] = [
    clickbait > 0
      ? `${clickbait} clickbait keyword(s) detected`
      : "No clickbait language detected",
    wordCount > 150
      ? `Detailed text (${wordCount} words)`
      : wordCount < 20
        ? `Very short text (${wordCount} words)`
        : `Text length: ${wordCount} words`,
    credibility > 0
      ? `${credibility} credibility indicator(s) found`
      : "No strong credibility indicators found",
  ];

  const claimFindings: string[] = [
    hedge > 0
      ? `${hedge} hedging/uncertain phrase(s) detected`
      : "No uncertain language detected",
    ...(scoringBreakdown.slice(0, 2).map((b) => b.reason)),
  ];

  const emotionalFindings: string[] = [
    emotional > 0
      ? `${emotional} emotionally charged word(s) detected`
      : "Neutral emotional tone",
    (metrics.all_caps_ratio as number) >= 0.15
      ? `Significant ALL-CAPS usage (${Math.round((metrics.all_caps_ratio as number) * 100)}%)`
      : "Normal capitalisation patterns",
    (metrics.exclamation_count as number) >= 2
      ? `${metrics.exclamation_count} exclamation marks detected`
      : "Normal punctuation usage",
  ];

  const credIndicatorFindings: string[] = [
    credibility > 0
      ? `${credibility} credibility signal(s) present`
      : "No strong credibility signals",
    (metrics.has_dates as boolean) ? "Specific dates referenced" : "No specific dates found",
    (metrics.has_numbers as boolean) ? "Specific numbers/statistics referenced" : "No specific statistics found",
  ];

  const emotionTone = emotional > 3
    ? "sensationalist"
    : emotional > 1
      ? "alarming"
      : clickbait > 0
        ? "persuasive"
        : credibility > 2
          ? "balanced"
          : "neutral";

  // Map source verification data from backend
  const svRaw = r.source_verification;
  const sourceVerificationData: SourceVerificationData = {
    verificationEnabled: svRaw?.verification_enabled ?? false,
    verificationStatus: svRaw?.verification_status ?? "unsupported",
    matchedSources: (svRaw?.matched_sources ?? []).map((m) => ({
      sourceName: m.source_name,
      domain: m.domain,
      similarityScore: m.similarity_score ?? 0,
      matchedHeadline: m.matched_headline ?? "",
      matchedEntities: m.matched_entities ?? [],
      note: m.note ?? "",
      status: m.status ?? "not_matched",
      isDomainMatch: m.is_domain_match ?? false,
    })),
    perSourceStatuses: (svRaw?.per_source_statuses ?? []).map((p) => ({
      sourceName: p.source_name,
      status: p.status,
      note: p.note ?? "",
      similarityScore: p.similarity_score ?? 0,
    })),
    contradictionCount: svRaw?.contradiction_count ?? 0,
    sourceCount: svRaw?.source_count ?? 0,
    verificationNotes: svRaw?.verification_notes ?? "",
  };

  return {
    verdict: mapVerdict(r.verdict),
    credibilityScore: score,
    explainableAI,
    llmStatus: r.llm_status,
    llmError: r.llm_error,
    sourceVerificationData,
    sourceVerification: {
      totalSourcesChecked: trustedSources.length,
      confirmingSources: confirming,
      disputingSources: disputing,
      crossPlatformConsistency: consistency,
      trustedSources,
    },
    aiAnalysis: {
      languagePatterns:     { score: languageScore,  findings: languageFindings },
      claimConsistency:     { score: claimScore,     findings: claimFindings },
      emotionalTone:        { score: emotionalScore, tone: emotionTone, findings: emotionalFindings },
      credibilityIndicators: { score: credScore,     findings: credIndicatorFindings },
    },
    summary: r.llm_summary || "Analysis complete.",
    recommendations,
  };
};

// ── Detect input type ───────────────────────────────────────────────────

const detectInputType = (input: string): "text" | "url" => {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return "url";
  return "text";
};

// ══════════════════════════════════════════════════════════════════════════
//  Hook
// ══════════════════════════════════════════════════════════════════════════

export const useNewsAnalysis = () => {
  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    currentStep: 0,
    progressPercent: 0,
    steps: [],
    result: null,
    error: null,
    streamId: null,
  });

  const setResult = useCallback((result: AnalysisResult) => {
    setState((prev) => ({
      ...prev,
      result,
      isAnalyzing: false,
      progressPercent: 100,
    }));
  }, []);

  const initializeSteps = (): VerificationStep[] => [
    { id: "submit",  label: "Submitting to TruthLens backend", status: "pending" },
    { id: "preprocess", label: "Preprocessing & text cleaning",  status: "pending" },
    { id: "extract", label: "Extracting features & claims",     status: "pending" },
    { id: "score",   label: "Computing credibility score",       status: "pending" },
    { id: "report",  label: "Building verification report",     status: "pending" },
  ];

  const updateStep = (stepIndex: number, update: Partial<VerificationStep>) => {
    setState((prev) => ({
      ...prev,
      currentStep: stepIndex,
      steps: prev.steps.map((step, idx) =>
        idx === stepIndex ? { ...step, ...update } : step,
      ),
    }));
  };

  const setProgressPercent = (progressPercent: number) => {
    setState((prev) => ({
      ...prev,
      progressPercent,
    }));
  };

  const animateProgress = async (start: number, end: number, durationMs: number) => {
    if (durationMs <= 0) {
      setProgressPercent(end);
      return;
    }

    const startedAt = performance.now();

    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - startedAt;
        const ratio = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - ratio, 2);
        const current = start + (end - start) * eased;

        setProgressPercent(current);

        if (ratio < 1) {
          window.setTimeout(tick, PROGRESS_TICK_MS);
          return;
        }

        resolve();
      };

      tick();
    });
  };

  const analyze = useCallback(async (content: string) => {
    // ── guard: must be logged in ──────────────────────────────────
    const token = localStorage.getItem("truthlens_access_token");
    if (!token) {
      console.error("[TruthLens] No access token found — user must log in.");
      setState((prev) => ({
        ...prev,
        error: "Please log in to analyse content.",
        isAnalyzing: false,
      }));
      return null;
    }

    const generatedStreamId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const steps = initializeSteps();
    setState({
      isAnalyzing: true,
      currentStep: 0,
      progressPercent: 0,
      steps,
      result: null,
      error: null,
      streamId: generatedStreamId,
    });

    const inputType = detectInputType(content);
    const payload = { input_type: inputType, input_value: content.trim(), stream_id: generatedStreamId };

    console.log("[TruthLens] Submitting analysis:", { url: "/analysis/submit/", method: "POST", payload });

    // Step 1 — submit
    updateStep(0, { status: "active", details: "Sending to backend…" });

    try {
      const responsePromise = api.post<BackendAnalysisResponse>("/analysis/submit/", payload);

      const progressPromise = (async () => {
        await animateProgress(
          STEP_PROGRESS_RANGES.submit[0],
          STEP_PROGRESS_RANGES.submit[1],
          STEP_PROGRESS_MS.submit,
        );
        updateStep(0, { status: "completed", details: "Submitted successfully" });

        updateStep(1, { status: "active", details: "Cleaning, normalising, and structuring text…" });
        await animateProgress(
          STEP_PROGRESS_RANGES.preprocess[0],
          STEP_PROGRESS_RANGES.preprocess[1],
          STEP_PROGRESS_MS.preprocess,
        );
        updateStep(1, { status: "completed", details: "Preprocessing complete" });

        updateStep(2, { status: "active", details: "Detecting entities, claims, keywords, and risk signals…" });
        await animateProgress(
          STEP_PROGRESS_RANGES.extract[0],
          STEP_PROGRESS_RANGES.extract[1],
          STEP_PROGRESS_MS.extract,
        );
        updateStep(2, { status: "completed", details: "Feature extraction complete" });

        updateStep(3, { status: "active", details: "Applying scoring rules and weighting source signals…" });
        await animateProgress(
          STEP_PROGRESS_RANGES.score[0],
          STEP_PROGRESS_RANGES.score[1],
          STEP_PROGRESS_MS.score,
        );
        updateStep(3, { status: "completed", details: "Credibility score computed" });

        updateStep(4, { status: "active", details: "Compiling findings into the final verification report…" });
        await animateProgress(
          STEP_PROGRESS_RANGES.report[0],
          STEP_PROGRESS_RANGES.report[1],
          STEP_PROGRESS_MS.report,
        );
      })();

      const [res] = await Promise.all([responsePromise, progressPromise]);

      console.log("[TruthLens] Response:", { success: res.success, data: res.data, error: res.error });

      // ── handle 401 / auth failure ─────────────────────────────────
      if (!res.success && res.error?.code === "HTTP_401") {
        console.warn("[TruthLens] 401 Unauthorized — clearing tokens.");
        clearTokens();
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: "Session expired. Please log in again.",
        }));
        window.location.href = "/auth";
        return null;
      }

      if (!res.success) {
        const msg = res.error?.message ?? "Analysis request failed.";
        console.error("[TruthLens] API error:", msg);
        updateStep(4, { status: "error", details: msg });
        setState((prev) => ({ ...prev, isAnalyzing: false, error: msg }));
        return null;
      }

      // Map backend response → frontend AnalysisResult
      if (!res.data?.result) {
        throw new Error("Backend returned an empty analysis payload.");
      }

      const analysisResult = mapBackendToAnalysisResult(res.data);
      const streamId = res.data.stream_id || generatedStreamId;

      setProgressPercent(100);
      updateStep(4, {
        status: "completed",
        details: "Report ready",
        sources: analysisResult.sourceVerification.trustedSources,
      });

      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        progressPercent: 100,
        result: analysisResult,
        streamId,
      }));

      console.log("[TruthLens] Analysis complete:", {
        verdict: analysisResult.verdict,
        score: analysisResult.credibilityScore,
      });

      return analysisResult;
    } catch (err) {
      console.error("[TruthLens] Network / unexpected error:", err);
      updateStep(0, { status: "error", details: "Network error" });
      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        progressPercent: 0,
        error: err instanceof Error ? err.message : "Network error — is the backend running?",
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      currentStep: 0,
      progressPercent: 0,
      steps: [],
      result: null,
      error: null,
      streamId: null,
    });
  }, []);

  return {
    ...state,
    analyze,
    reset,
    setResult,
  };
};
