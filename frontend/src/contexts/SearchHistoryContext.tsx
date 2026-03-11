import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { AnalysisResult } from "@/hooks/useNewsAnalysis";

const STORAGE_KEY = "truthlens_search_history";

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  type: "url" | "text";
  result?: AnalysisResult;
}

interface StoredHistoryItem extends Omit<SearchHistoryItem, 'timestamp'> {
  timestamp: string;
}

interface SearchHistoryContextType {
  history: SearchHistoryItem[];
  addToHistory: (query: string, result?: AnalysisResult) => string;
  updateHistoryResult: (id: string, result: AnalysisResult) => void;
  clearHistory: () => void;
  selectedHistoryItem: SearchHistoryItem | null;
  setSelectedHistoryItem: (item: SearchHistoryItem | null) => void;
  getHistoryItemById: (id: string) => SearchHistoryItem | undefined;
  newAnalysisRequested: boolean;
  setNewAnalysisRequested: (val: boolean) => void;
}

const SearchHistoryContext = createContext<SearchHistoryContextType | undefined>(undefined);

const loadHistoryFromStorage = (): SearchHistoryItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: StoredHistoryItem[] = JSON.parse(stored);
    return parsed.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));
  } catch (error) {
    console.error("Failed to load search history:", error);
    return [];
  }
};

const saveHistoryToStorage = (history: SearchHistoryItem[]) => {
  try {
    const toStore: StoredHistoryItem[] = history.map(item => ({
      ...item,
      timestamp: item.timestamp.toISOString()
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error("Failed to save search history:", error);
  }
};

export const SearchHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => loadHistoryFromStorage());
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SearchHistoryItem | null>(null);
  const [newAnalysisRequested, setNewAnalysisRequested] = useState(false);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    saveHistoryToStorage(history);
  }, [history]);

  const addToHistory = useCallback((query: string, result?: AnalysisResult): string => {
    const isUrl = query.startsWith("http://") || query.startsWith("https://");
    const id = Date.now().toString();
    const newItem: SearchHistoryItem = {
      id,
      query,
      timestamp: new Date(),
      type: isUrl ? "url" : "text",
      result,
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 9)]); // Keep last 10 items
    return id;
  }, []);

  const updateHistoryResult = useCallback((id: string, result: AnalysisResult) => {
    setHistory((prev) => 
      prev.map((item) => 
        item.id === id ? { ...item, result } : item
      )
    );
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getHistoryItemById = useCallback((id: string) => {
    return history.find((item) => item.id === id);
  }, [history]);

  return (
    <SearchHistoryContext.Provider
      value={{ 
        history, 
        addToHistory, 
        updateHistoryResult,
        clearHistory, 
        selectedHistoryItem, 
        setSelectedHistoryItem,
        getHistoryItemById,
        newAnalysisRequested,
        setNewAnalysisRequested,
      }}
    >
      {children}
    </SearchHistoryContext.Provider>
  );
};

export const useSearchHistory = () => {
  const context = useContext(SearchHistoryContext);
  if (!context) {
    throw new Error("useSearchHistory must be used within a SearchHistoryProvider");
  }
  return context;
};
