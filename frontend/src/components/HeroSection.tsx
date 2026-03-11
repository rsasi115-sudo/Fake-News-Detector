import { Button } from "@/components/ui/button";
import { Search, BrainCircuit, Sparkles, ArrowRight, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import AnalyzeOptionsPopover from "./AnalyzeOptionsPopover";
import VerificationProgress from "./VerificationProgress";
import FullReportSection from "./FullReportSection";
import { useNewsAnalysis } from "@/hooks/useNewsAnalysis";
import { useSearchHistory } from "@/contexts/SearchHistoryContext";
import type { AnalysisResult } from "@/hooks/useNewsAnalysis";

const HeroSection = () => {
  const [inputValue, setInputValue] = useState("");
  const [currentQuery, setCurrentQuery] = useState("");
  const { isAnalyzing, steps, currentStep, result, analyze, reset, setResult } = useNewsAnalysis();
  const { selectedHistoryItem, setSelectedHistoryItem, addToHistory, updateHistoryResult, newAnalysisRequested, setNewAnalysisRequested } = useSearchHistory();
  const currentHistoryIdRef = useRef<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  // Handle "New Analysis" request from header
  useEffect(() => {
    if (newAnalysisRequested) {
      setInputValue("");
      setCurrentQuery("");
      reset();
      setNewAnalysisRequested(false);
      // Scroll to hero and focus input
      setTimeout(() => {
        heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        inputRef.current?.focus();
      }, 100);
    }
  }, [newAnalysisRequested, setNewAnalysisRequested, reset]);

  // Load stored result or auto-trigger analysis when a history item is selected
  useEffect(() => {
    if (selectedHistoryItem) {
      const query = selectedHistoryItem.query;
      setCurrentQuery(query);
      setInputValue(query);
      
      if (selectedHistoryItem.result) {
        // Display stored result directly
        setResult(selectedHistoryItem.result);
      } else {
        // No cached result — auto-trigger analysis
        const historyId = addToHistory(query);
        if (historyId) {
          currentHistoryIdRef.current = historyId;
        }
        analyze(query);
      }
      setSelectedHistoryItem(null);
    }
  }, [selectedHistoryItem, setSelectedHistoryItem, setResult, analyze, addToHistory]);

  // Scroll to results when they appear
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  // Update history with result when analysis completes
  useEffect(() => {
    if (result && currentHistoryIdRef.current) {
      updateHistoryResult(currentHistoryIdRef.current, result);
      currentHistoryIdRef.current = null;
    }
  }, [result, updateHistoryResult]);

  const handleAnalyze = async () => {
    if (inputValue.trim()) {
      setCurrentQuery(inputValue);
      // Add to history first and store the ID
      const historyId = addToHistory(inputValue);
      if (historyId) {
        currentHistoryIdRef.current = historyId;
      }
      await analyze(inputValue);
    }
  };

  const handleRerun = async () => {
    if (currentQuery.trim()) {
      const historyId = addToHistory(currentQuery);
      if (historyId) {
        currentHistoryIdRef.current = historyId;
      }
      await analyze(currentQuery);
    }
  };

  const handleOptionSelect = (type: string, data?: string) => {
    if (data) {
      setInputValue(`[${type.toUpperCase()}]: ${data}`);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setCurrentQuery("");
    reset();
  };

  return (
    <section ref={heroRef} className="relative min-h-screen flex flex-col pt-16 overflow-hidden">
      {/* Modern Gradient Background with AI Pattern */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,50%,12%)] via-[hsl(200,60%,18%)] to-[hsl(260,40%,20%)]" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[hsl(175,70%,40%)] rounded-full opacity-10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[hsl(220,70%,50%)] rounded-full opacity-15 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[hsl(260,50%,40%)] rounded-full opacity-10 blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(175,70%,50%) 1px, transparent 1px),
              linear-gradient(90deg, hsl(175,70%,50%) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Neural network dots */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-secondary/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 0.6, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content - Input Section */}
      <div className="relative z-10 container mx-auto px-4 text-center flex-shrink-0 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-white/90">
              Powered by Advanced NLP Technology
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 text-white">
            Detect{" "}
            <span className="bg-gradient-to-r from-[hsl(175,70%,50%)] to-[hsl(200,80%,60%)] bg-clip-text text-transparent">Fake News</span>
            <br />
            Before It Spreads
          </h1>

          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Our AI-powered platform uses Natural Language Processing to analyze news articles,
            social media posts, and claims in real-time. Get instant credibility scores
            and detailed fact-checks.
          </p>

          {/* Search Input with Options */}
          <AnimatePresence mode="wait">
            {!isAnalyzing && !result && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.4 }}
                className="max-w-2xl mx-auto mb-8"
              >
                <div className="relative group">
                  {/* Glow effect behind input */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-secondary/40 via-accent/30 to-secondary/40 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  
                  <div className="relative bg-white/95 dark:bg-[hsl(222,47%,11%)]/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-white/20 dark:border-white/10">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder="Paste a news article URL or enter text to analyze..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                          className="w-full h-14 pl-12 pr-4 bg-muted/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 text-base transition-all"
                        />
                      </div>
                      <div className="flex gap-2">
                        <AnalyzeOptionsPopover onOptionSelect={handleOptionSelect} />
                        <Button
                          variant="hero"
                          size="lg"
                          onClick={handleAnalyze}
                          disabled={!inputValue.trim()}
                          className="flex-1 sm:flex-none h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                          Analyze Now
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Quick analysis time indicator */}
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Average analysis time: 30-45 seconds</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancel button during analysis */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-4"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Analysis
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust Stats - only show when not analyzing */}
          <AnimatePresence>
            {!isAnalyzing && !result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap justify-center gap-8 md:gap-16 mt-8"
              >
                {[
                  { value: "99.2%", label: "Detection Accuracy" },
                  { value: "10M+", label: "Articles Analyzed" },
                  { value: "<45s", label: "Analysis Time" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl md:text-3xl font-display font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="text-sm text-white/70">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Elements - only show when no result */}
          {!result && (
            <>
              <motion.div
                className="absolute top-32 left-[10%] w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center hidden lg:flex"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <BrainCircuit className="w-8 h-8 text-secondary" />
              </motion.div>

              <motion.div
                className="absolute bottom-32 right-[15%] w-16 h-16 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center hidden lg:flex"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <Sparkles className="w-6 h-6 text-accent" />
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      {/* Verification Progress Section */}
      <AnimatePresence>
        {isAnalyzing && steps.length > 0 && (
          <div className="relative z-10 container mx-auto px-4">
            <VerificationProgress steps={steps} currentStep={currentStep} />
          </div>
        )}
      </AnimatePresence>

      {/* Full Report Results Section */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 bg-background pt-8 pb-16"
          >
            {/* Transition gradient */}
            <div className="absolute inset-x-0 -top-16 h-16 bg-gradient-to-b from-transparent to-background" />
            
            <div className="container mx-auto px-4">
              <FullReportSection
                result={result}
                query={currentQuery}
                onClear={handleClear}
                onRerun={handleRerun}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom fade when showing input */}
      {!result && (
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-0" />
      )}
    </section>
  );
};

export default HeroSection;
