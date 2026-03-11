import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle, Search, Shield, Database, Brain, FileCheck } from "lucide-react";
import type { VerificationStep } from "@/hooks/useNewsAnalysis";

type VerificationProgressProps = {
  steps: VerificationStep[];
  currentStep: number;
};

const stepIcons: Record<string, typeof Search> = {
  search: Search,
  verify: Shield,
  crossref: Database,
  analyze: Brain,
  compile: FileCheck,
};

const VerificationProgress = ({ steps, currentStep }: VerificationProgressProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto mt-6"
    >
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-secondary" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-secondary/50"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">
              Verification in Progress
            </h3>
            <p className="text-sm text-muted-foreground">
              Searching trusted sources before AI analysis
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = stepIcons[step.id] || Search;
            const isActive = step.status === "active";
            const isCompleted = step.status === "completed";
            const isPending = step.status === "pending";
            const isError = step.status === "error";

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-secondary/10 border border-secondary/30"
                    : isCompleted
                    ? "bg-success/5 border border-success/20"
                    : isError
                    ? "bg-destructive/5 border border-destructive/20"
                    : "bg-muted/30 border border-transparent"
                }`}
              >
                {/* Status indicator */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? "bg-secondary/20"
                        : isCompleted
                        ? "bg-success/20"
                        : isError
                        ? "bg-destructive/20"
                        : "bg-muted/50"
                    }`}
                  >
                    {isActive && (
                      <Loader2 className="w-5 h-5 text-secondary animate-spin" />
                    )}
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Check className="w-5 h-5 text-success" />
                      </motion.div>
                    )}
                    {isError && <AlertCircle className="w-5 h-5 text-destructive" />}
                    {isPending && (
                      <Icon className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium transition-colors ${
                        isActive
                          ? "text-secondary"
                          : isCompleted
                          ? "text-success"
                          : isError
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-xs text-secondary/70"
                      >
                        Processing...
                      </motion.span>
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {step.details && (
                      <motion.p
                        key={step.details}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`text-sm mt-1 ${
                          isActive ? "text-secondary/80" : "text-muted-foreground"
                        }`}
                      >
                        {step.details}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Progress line to next step */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[2.25rem] top-14 w-0.5 h-3 bg-border/50" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium text-foreground">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-secondary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Trust indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Trusted sources verified before AI analysis</span>
        </div>
      </div>
    </motion.div>
  );
};

export default VerificationProgress;
