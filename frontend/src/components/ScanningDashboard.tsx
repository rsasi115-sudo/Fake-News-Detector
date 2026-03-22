/**
 * ScanningDashboard.tsx
 * Two-column layout: Existing scans (left) and Live terminal scanning (right)
 * Features real-time animation and scan history display
 */

import { motion, AnimatePresence } from "framer-motion";
import { Clock, Check, X, Terminal, Zap, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface ScanningDashboardProps {
  isScanning?: boolean;
  terminalOutput?: TerminalOutput[];
  existingScans?: ScanResult[];
  currentUrl?: string;
  onClear?: () => void;
  onStopScanning?: () => void;
}

const ScanningDashboard: React.FC<ScanningDashboardProps> = ({
  isScanning = false,
  terminalOutput = [],
  existingScans = [],
  currentUrl = "",
  onClear,
  onStopScanning,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [displayedOutput, setDisplayedOutput] = useState<TerminalOutput[]>([]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [displayedOutput]);

  // Simulate typing animation for terminal output
  useEffect(() => {
    if (terminalOutput.length > displayedOutput.length) {
      const timer = setTimeout(() => {
        setDisplayedOutput(terminalOutput.slice(0, displayedOutput.length + 1));
      }, 50); // Adjust speed here
      return () => clearTimeout(timer);
    }
  }, [terminalOutput, displayedOutput.length]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4 text-success" />;
      case "failed":
        return <X className="w-4 h-4 text-destructive" />;
      case "in-progress":
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-4 h-4 text-secondary" />
          </motion.div>
        );
      default:
        return null;
    }
  };

  const getVerdictColor = (verdict?: string) => {
    switch (verdict) {
      case "real":
        return "bg-success/10 text-success border-success/30";
      case "fake":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "uncertain":
        return "bg-warning/10 text-warning border-warning/30";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/30";
    }
  };

  const getTerminalTextColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Scan Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isScanning ? "Scanning in progress..." : "View scan history and live terminal output"}
          </p>
        </div>
        {isScanning && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm font-medium text-secondary">Live</span>
          </motion.div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Existing Scans */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="h-full border-border/50 backdrop-blur-xl bg-card/95">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-secondary" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {existingScans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Clock className="w-12 h-12 text-muted/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No scans yet. Start by analyzing a URL.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] md:h-[500px]">
                  <div className="space-y-2 px-4 py-2">
                    <AnimatePresence>
                      {existingScans.map((scan, index) => (
                        <motion.div
                          key={scan.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 rounded-lg border border-border/30 hover:border-border/60 hover:bg-muted/50 transition-all duration-300 group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getStatusIcon(scan.status)}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-foreground truncate">
                                  {scan.url}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(scan.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {scan.verdict && scan.confidence !== undefined && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={getVerdictColor(scan.verdict)}
                              >
                                {scan.verdict.charAt(0).toUpperCase() +
                                  scan.verdict.slice(1)}
                              </Badge>
                              <span className="text-xs font-semibold text-muted-foreground">
                                {Math.round(scan.confidence)}%
                              </span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
              {existingScans.length > 0 && (
                <div className="border-t border-border/30 p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={onClear}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Clear History
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Terminal Scanning */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full border-border/50 backdrop-blur-xl bg-card/95">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between gap-2 text-lg">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-secondary" />
                  Live Terminal
                </div>
                {isScanning && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onStopScanning}
                  >
                    Stop
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative">
                {/* Terminal Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-background to-background/80 rounded-lg opacity-50" />

                {/* Terminal Content */}
                <div
                  ref={terminalRef}
                  className="relative h-[400px] md:h-[500px] bg-black/20 backdrop-blur rounded-lg border border-border/30 p-4 font-mono text-xs overflow-y-auto"
                >
                  {currentUrl && (
                    <div className="text-muted-foreground mb-2">
                      <span className="text-secondary">$</span> Scanning:{" "}
                      <span className="text-foreground">{currentUrl}</span>
                    </div>
                  )}

                  <AnimatePresence>
                    {displayedOutput.length === 0 && !isScanning ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        className="text-muted-foreground flex items-center justify-center h-full"
                      >
                        <p>No scanning activity. Ready to scan.</p>
                      </motion.div>
                    ) : (
                      <div className="space-y-1">
                        {displayedOutput.map((output, index) => (
                          <motion.div
                            key={output.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`${getTerminalTextColor(output.type)} flex items-start gap-2`}
                          >
                            <span className="text-muted-foreground flex-shrink-0">
                              {output.type === "log" && "$"}
                              {output.type === "success" && "✓"}
                              {output.type === "error" && "✗"}
                              {output.type === "warning" && "!"}
                            </span>
                            <span className="flex-1 break-words">
                              {output.text}
                            </span>
                          </motion.div>
                        ))}

                        {/* Typing cursor animation */}
                        {isScanning && (
                          <motion.div
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-secondary inline-block"
                          >
                            ▌
                          </motion.div>
                        )}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Status Indicator */}
                {isScanning && (
                  <div className="absolute top-3 right-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-3 h-3 rounded-full bg-secondary"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Current Scan Info */}
      {isScanning && currentUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-secondary/10 border border-secondary/30 rounded-lg"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-5 h-5 text-secondary flex-shrink-0" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {currentUrl}
            </p>
            <p className="text-xs text-muted-foreground">Scanning in progress...</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ScanningDashboard;
