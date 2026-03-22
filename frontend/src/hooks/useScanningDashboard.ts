/**
 * useScanningDashboard.ts
 * Custom hook to manage scanning state, terminal output, and scan history
 */

import { useState, useCallback, useEffect } from "react";

interface ScanResult {
  id: string;
  url: string;
  timestamp: number;
  status: "completed" | "failed" | "in-progress";
  verdict?: "real" | "fake" | "uncertain";
  confidence?: number;
}

interface TerminalOutput {
  id: string;
  timestamp: number;
  text: string;
  type: "log" | "success" | "error" | "warning";
}

interface UseScanningDashboardReturn {
  isScanning: boolean;
  currentUrl: string;
  terminalOutput: TerminalOutput[];
  existingScans: ScanResult[];
  startScanning: (url: string) => void;
  stopScanning: () => void;
  addTerminalOutput: (text: string, type?: "log" | "success" | "error" | "warning") => void;
  addScanResult: (scan: ScanResult) => void;
  clearHistory: () => void;
  clearTerminal: () => void;
}

export const useScanningDashboard = (): UseScanningDashboardReturn => {
  const [isScanning, setIsScanning] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [existingScans, setExistingScans] = useState<ScanResult[]>([]);

  // Load scan history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("scan_history");
    if (saved) {
      try {
        setExistingScans(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load scan history:", error);
      }
    }
  }, []);

  // Save scan history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("scan_history", JSON.stringify(existingScans));
  }, [existingScans]);

  const startScanning = useCallback((url: string) => {
    setIsScanning(true);
    setCurrentUrl(url);
    setTerminalOutput([
      {
        id: `init-${Date.now()}`,
        timestamp: Date.now(),
        text: `Starting scan for: ${url}`,
        type: "log",
      },
    ]);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    addTerminalOutput("Scan cancelled by user", "warning");
  }, []);

  const addTerminalOutput = useCallback(
    (text: string, type: "log" | "success" | "error" | "warning" = "log") => {
      const newOutput: TerminalOutput = {
        id: `output-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        text,
        type,
      };
      setTerminalOutput((prev) => [...prev, newOutput]);
    },
    []
  );

  const addScanResult = useCallback((scan: ScanResult) => {
    setExistingScans((prev) => [scan, ...prev].slice(0, 50)); // Keep last 50 scans
  }, []);

  const clearHistory = useCallback(() => {
    setExistingScans([]);
    localStorage.removeItem("scan_history");
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalOutput([]);
  }, []);

  return {
    isScanning,
    currentUrl,
    terminalOutput,
    existingScans,
    startScanning,
    stopScanning,
    addTerminalOutput,
    addScanResult,
    clearHistory,
    clearTerminal,
  };
};
