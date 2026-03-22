/**
 * LogPanel.tsx
 * Real-time backend processing logs display with auto-scroll.
 * Displays logs from the backend in a terminal-style panel.
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, Trash2 } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "success" | "warning" | "error" | "debug";
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  isStreaming?: boolean;
  onClear?: () => void;
}

const LogPanel: React.FC<LogPanelProps> = ({
  logs,
  isStreaming = false,
  onClear,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const copyLogs = () => {
    const logText = logs
      .map((log) => {
        const time = showTimestamps
          ? new Date(log.timestamp).toLocaleTimeString()
          : "";
        return `${time ? `[${time}] ` : ""}${log.message}`;
      })
      .join("\n");

    navigator.clipboard.writeText(logText);
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      case "debug":
        return "text-gray-500";
      default:
        return "text-blue-400";
    }
  };

  const getLogBgColor = (level: string) => {
    switch (level) {
      case "success":
        return "bg-green-950";
      case "warning":
        return "bg-yellow-950";
      case "error":
        return "bg-red-950";
      case "debug":
        return "bg-gray-800";
      default:
        return "bg-gray-900";
    }
  };

  return (
    <div className="flex flex-col h-full border border-gray-700 rounded-lg bg-gray-950 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-300">
              Backend Logs
            </span>
            {isStreaming && (
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">Live</span>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 ml-2">
            ({logs.length} entries)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Show timestamps toggle */}
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200 transition"
            title="Toggle timestamps"
          >
            <span className="text-xs">T</span>
          </button>

          {/* Auto-scroll indicator */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded transition ${
              autoScroll
                ? "bg-blue-900 text-blue-400 hover:bg-blue-800"
                : "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
            title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}
          >
            <ChevronDown size={16} />
          </button>

          {/* Copy logs button */}
          <button
            onClick={copyLogs}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200 transition"
            title="Copy all logs"
          >
            <Copy size={16} />
          </button>

          {/* Clear logs button */}
          <button
            onClick={onClear}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200 transition"
            title="Clear logs"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-sm p-4 space-y-1"
        style={{
          scrollBehavior: "smooth",
        }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-600 text-center py-8">
            Waiting for backend logs...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`px-3 py-1 rounded flex items-start gap-2 ${getLogBgColor(
                log.level
              )}`}
            >
              {/* Level indicator */}
              <span className={`text-xs font-bold min-w-max ${getLogColor(log.level)}`}>
                [{log.level.toUpperCase()}]
              </span>

              {/* Timestamp (optional) */}
              {showTimestamps && (
                <span className="text-xs text-gray-600 min-w-max">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              )}

              {/* Message */}
              <span className="text-gray-200 break-words flex-1">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
        {isStreaming ? "Connected • Receiving logs..." : "Disconnected"}
      </div>
    </div>
  );
};

export default LogPanel;
