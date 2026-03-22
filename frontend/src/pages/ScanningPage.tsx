/**
 * ScanningPage.tsx
 * Example page showing the ScanningDashboard integrated with the scanning workflow
 * This demonstrates how to connect the dashboard with real backend operations
 */

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScanningDashboard from "@/components/ScanningDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScanningDashboard } from "@/hooks/useScanningDashboard";
import { motion } from "framer-motion";

const ScanningPage = () => {
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

  const [inputUrl, setInputUrl] = useState("");

  // Example: Simulate backend WebSocket connection for live terminal output
  useEffect(() => {
    if (!isScanning) return;

    // Simulate receiving terminal output from backend
    const simulateTerminalOutput = () => {
      const outputs = [
        { text: "Connecting to analysis service...", type: "log" as const },
        { text: "Fetching article content...", type: "log" as const },
        { text: "Content extracted successfully", type: "success" as const },
        { text: "Running feature extraction...", type: "log" as const },
        { text: "Connecting to Ollama service...", type: "log" as const },
        { text: "Generating embeddings...", type: "log" as const },
        { text: "Running verification pipeline...", type: "log" as const },
        { text: "Checking source credibility...", type: "log" as const },
        { text: "Analyzing writing patterns...", type: "log" as const },
        { text: "Calculating confidence scores...", type: "log" as const },
      ];

      let delay = 500;
      outputs.forEach((output, index) => {
        setTimeout(() => {
          addTerminalOutput(output.text, output.type);
        }, delay);
        delay += 800 + Math.random() * 400;
      });

      // Simulate completion
      setTimeout(() => {
        addTerminalOutput("Analysis complete!", "success");
        addTerminalOutput("Generating report...", "log");

        setTimeout(() => {
          stopScanning();
          addScanResult({
            id: `scan-${Date.now()}`,
            url: currentUrl,
            timestamp: Date.now(),
            status: "completed",
            verdict: "fake",
            confidence: 87.5,
          });
          addTerminalOutput("Scan finished successfully", "success");
        }, 1000);
      }, delay);
    };

    // Start simulation after a short delay
    const timer = setTimeout(simulateTerminalOutput, 300);
    return () => clearTimeout(timer);
  }, [isScanning, currentUrl, addTerminalOutput, addScanResult, stopScanning]);

  const handleStartScan = () => {
    if (inputUrl.trim()) {
      startScanning(inputUrl);
      // In a real app, you would trigger the backend scanning here
      // via API call or WebSocket connection
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputUrl.trim()) {
      handleStartScan();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-display font-bold text-foreground mb-3">
              News Verification Scanner
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Analyze article credibility in real-time. Watch the scanning process
              as we verify your content against multiple sources.
            </p>
          </motion.div>

          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="Enter article URL to scan..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isScanning}
                className="flex-1"
              />
              <Button
                onClick={handleStartScan}
                disabled={isScanning || !inputUrl.trim()}
                className="px-6"
              >
                {isScanning ? "Scanning..." : "Start Scan"}
              </Button>
            </div>
          </motion.div>

          {/* Scanning Dashboard */}
          <ScanningDashboard
            isScanning={isScanning}
            terminalOutput={terminalOutput}
            existingScans={existingScans}
            currentUrl={currentUrl}
            onClear={clearHistory}
            onStopScanning={stopScanning}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ScanningPage;
