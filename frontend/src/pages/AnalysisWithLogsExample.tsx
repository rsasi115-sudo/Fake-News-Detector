/**
 * AnalysisWithLogsExample.tsx
 * Example component showing how to integrate LogPanel with existing processing UI.
 * 
 * This demonstrates:
 * 1. Using useBackendLogs hook to stream logs from backend
 * 2. Passing analysis_id from the analysis response
 * 3. Displaying both processing panel and log panel side-by-side
 * 4. Coordinating log connection lifecycle with analysis flow
 */

import React, { useState, useEffect } from "react";
import { useBackendLogs } from "@/hooks/useBackendLogs";
import LogPanel from "@/components/LogPanel";
import { useNewsAnalysis } from "@/hooks/useNewsAnalysis";

/**
 * Example: Integrated Analysis Component with Live Backend Logs
 * 
 * Usage:
 * 1. Replace your existing analysis component with this pattern
 * 2. Pass analysis_id from the backend response to useBackendLogs
 * 3. The log connection will establish when analysisId is set
 */
export function AnalysisPageWithLogs() {
  const [analysisId, setAnalysisId] = useState<string>();
  const [inputUrl, setInputUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Use existing news analysis hook
  const {
    result,
    loading,
    error,
    progress,
    analyze,
  } = useNewsAnalysis();

  // Connect to backend logs when analysis starts
  const {
    logs,
    isConnected: logsConnected,
    isStreaming,
    error: logsError,
    clearLogs,
  } = useBackendLogs({
    analysisId,
    enabled: !!analysisId,  // Only connect when we have an analysis_id
    maxLogs: 500,
  });

  // Handle analysis submission
  const handleAnalyze = async () => {
    if (!inputUrl.trim()) {
      alert("Please enter a URL or text to analyze");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisId(undefined);  // Clear previous analysis_id

    try {
      // Call existing analyze function (returns the analysis result)
      const result = await analyze({
        input_type: "url",
        input_value: inputUrl,
      });

      // Extract analysis_id from result to connect logs
      // Backend needs to include id in response
      if (result && result.id) {
        setAnalysisId(result.id);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TruthLens - Fact-Checking Analysis
          </h1>
          <p className="text-gray-600">
            Monitor backend processing and source verification in real-time
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter URL or Text to Analyze
          </label>
          <textarea
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter a URL (e.g., https://...) or paste text content..."
            className="w-full h-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isAnalyzing}
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || loading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isAnalyzing || loading ? "Analyzing..." : "Start Analysis"}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Main Layout: Processing Panel + Log Panel Side-by-Side */}
        {(isAnalyzing || loading || analysisId) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-96">
            {/* Left: Existing Processing Panel */}
            <div className="bg-white rounded-lg shadow p-6 h-full">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Processing Progress
              </h2>

              {/* Your existing processing panel here */}
              <div className="space-y-3">
                {/* Example processing stages */}
                <ProcessingStage
                  name="Submitting to backend"
                  progress={progress?.current?.stage === "submit" ? 100 : 0}
                  isComplete={progress?.current?.stage !== "submit"}
                />
                <ProcessingStage
                  name="Preprocessing & text cleaning"
                  progress={progress?.current?.stage === "preprocess" ? 100 : 0}
                  isComplete={progress?.current?.stage !== "preprocess"}
                />
                <ProcessingStage
                  name="Extracting features & claims"
                  progress={progress?.current?.stage === "extract" ? 100 : 0}
                  isComplete={progress?.current?.stage !== "extract"}
                />
                <ProcessingStage
                  name="Computing credibility score"
                  progress={progress?.current?.stage === "score" ? 100 : 0}
                  isComplete={progress?.current?.stage !== "score"}
                />
                <ProcessingStage
                  name="Building verification report"
                  progress={progress?.current?.stage === "report" ? 100 : 0}
                  isComplete={progress?.current?.stage !== "report"}
                />
              </div>

              {/* Connection Status */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Backend Connection:</span>
                    <span
                      className={`ml-2 font-semibold ${
                        logsConnected ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {logsConnected ? "✓ Connected" : "○ Waiting..."}
                    </span>
                  </p>
                  {analysisId && (
                    <p>
                      <span className="text-gray-600">Analysis ID:</span>
                      <span className="ml-2 font-mono text-xs text-gray-700">
                        {analysisId}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Log Panel */}
            <div className="h-full" style={{ minHeight: "400px" }}>
              <LogPanel
                logs={logs}
                isStreaming={isStreaming}
                onClear={clearLogs}
              />

              {logsError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {logsError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Section (when analysis is done) */}
        {result && !loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Analysis Results
            </h2>

            {/* Your existing result display here */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Verdict</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {result.verdict}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Credibility Score</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${result.score}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">{result.score}/100</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper Component: Processing Stage Display
 */
function ProcessingStage({
  name,
  progress,
  isComplete,
}: {
  name: string;
  progress: number;
  isComplete: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        {isComplete && <span className="text-xs text-green-600 font-semibold">✓</span>}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isComplete ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default AnalysisPageWithLogs;
