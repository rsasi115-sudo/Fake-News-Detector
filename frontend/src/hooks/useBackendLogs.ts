/**
 * useBackendLogs.ts
 * Custom React hook for managing backend log streaming via WebSocket.
 * Handles connection lifecycle, message parsing, and auto-scroll management.
 */

import { useEffect, useCallback, useRef, useState, useMemo } from "react";

interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "success" | "warning" | "error" | "debug";
  message: string;
}

interface BackendLogMessage {
  type: "log" | "status" | "error";
  level?: "info" | "success" | "warning" | "error" | "debug";
  message: string;
  timestamp?: number;
}

interface UseBackendLogsOptions {
  analysisId?: string;
  enabled?: boolean;
  onLogReceived?: (log: LogEntry) => void;
  onConnectionChange?: (connected: boolean) => void;
  maxLogs?: number;
}

/**
 * Hook to stream backend logs via WebSocket.
 * 
 * Usage:
 * ```tsx
 * const { logs, isConnected, isStreaming, clearLogs } = useBackendLogs({
 *   analysisId: "12345",
 *   enabled: true,
 *   maxLogs: 500
 * });
 * ```
 */
export const useBackendLogs = ({
  analysisId,
  enabled = true,
  onLogReceived,
  onConnectionChange,
  maxLogs = 500,
}: UseBackendLogsOptions = {}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const logCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Generate WebSocket URL based on environment
  const getWebSocketUrl = useCallback(() => {
    const wsBase = import.meta.env.VITE_WS_BASE_URL as string | undefined;
    const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

    let baseUrl: string;
    if (wsBase) {
      baseUrl = wsBase;
    } else if (apiBase) {
      const apiUrl = new URL(apiBase);
      apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
      baseUrl = `${apiUrl.protocol}//${apiUrl.host}`;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      baseUrl = `${protocol}//${window.location.host}`;
    }

    const analysisIdParam = analysisId ? `?analysis_id=${analysisId}` : "";
    return `${baseUrl}/ws/logs/${analysisIdParam}`;
  }, [analysisId]);

  // Add a log entry
  const addLog = useCallback((
    message: string,
    level: "info" | "success" | "warning" | "error" | "debug" = "info",
    timestamp = Date.now()
  ) => {
    const logId = `${timestamp}-${logCountRef.current}`;
    logCountRef.current += 1;

    const logEntry: LogEntry = {
      id: logId,
      timestamp,
      level,
      message,
    };

    setLogs((prevLogs) => {
      const newLogs = [...prevLogs, logEntry];
      // Keep only the most recent maxLogs entries
      return newLogs.slice(-maxLogs);
    });

    onLogReceived?.(logEntry);
  }, [maxLogs, onLogReceived]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const wsUrl = getWebSocketUrl();
      console.log("[WebSocket] Connecting to:", wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        setIsStreaming(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        addLog("Connected to backend log stream", "success");
        onConnectionChange?.(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: BackendLogMessage = JSON.parse(event.data);

          if (data.type === "log") {
            addLog(
              data.message,
              data.level || "info",
              data.timestamp || Date.now()
            );
          } else if (data.type === "status") {
            addLog(data.message, "info", data.timestamp || Date.now());
          } else if (data.type === "error") {
            addLog(data.message, "error", data.timestamp || Date.now());
          }
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
          addLog(
            `Failed to parse message: ${event.data}`,
            "error"
          );
        }
      };

      ws.onerror = (event) => {
        console.error("[WebSocket] Error:", event);
        const errorMsg = "WebSocket connection error";
        setError(errorMsg);
        addLog(errorMsg, "error");
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);
        setIsStreaming(false);
        onConnectionChange?.(false);

        // Attempt to reconnect if still enabled
        if (enabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[WebSocket] Reconnecting in ${backoffMs}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffMs);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError("Max reconnection attempts reached");
          addLog("Failed to reconnect after multiple attempts", "error");
        }
      };

      wsRef.current = ws;
    } catch (err) {
      const errorMsg = `Failed to create WebSocket: ${err instanceof Error ? err.message : String(err)}`;
      console.error("[WebSocket]", errorMsg);
      setError(errorMsg);
      addLog(errorMsg, "error");
    }
  }, [enabled, getWebSocketUrl, addLog, onConnectionChange]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    logCountRef.current = 0;
    addLog("Logs cleared", "info");
  }, [addLog]);

  // Lifecycle: connect/disconnect based on enabled flag
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return useMemo(
    () => ({
      logs,
      isConnected,
      isStreaming,
      error,
      clearLogs,
      addLog,
      connect,
      disconnect,
    }),
    [logs, isConnected, isStreaming, error, clearLogs, addLog, connect, disconnect]
  );
};

export type { LogEntry, BackendLogMessage, UseBackendLogsOptions };
