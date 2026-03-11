import { motion } from "framer-motion";
import { 
  CheckCircle, XCircle, AlertTriangle, HelpCircle, 
  Shield, Brain, ExternalLink, TrendingUp, TrendingDown,
  FileText, Users, Globe, AlertOctagon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalysisResult, TrustedSource } from "@/hooks/useNewsAnalysis";

type AnalysisResultCardProps = {
  result: AnalysisResult;
  onClear: () => void;
  onViewDetails: () => void;
};

const verdictConfig = {
  real: {
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    badgeVariant: "default" as const,
    label: "Credible News",
    description: "This content appears to be authentic and from reliable sources.",
  },
  fake: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    badgeVariant: "destructive" as const,
    label: "Fake News Detected",
    description: "This content shows significant credibility issues.",
  },
  misleading: {
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
    badgeVariant: "secondary" as const,
    label: "Potentially Misleading",
    description: "This content may contain inaccuracies or missing context.",
  },
  unverified: {
    icon: HelpCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted/10",
    borderColor: "border-muted/30",
    badgeVariant: "outline" as const,
    label: "Unverified",
    description: "Unable to definitively verify this content.",
  },
};

const SourceItem = ({ source }: { source: TrustedSource }) => {
  const reportTypeConfig = {
    confirms: { icon: CheckCircle, color: "text-success", label: "Confirms" },
    disputes: { icon: XCircle, color: "text-destructive", label: "Disputes" },
    unrelated: { icon: AlertTriangle, color: "text-warning", label: "Related" },
    not_found: { icon: HelpCircle, color: "text-muted-foreground", label: "Not Found" },
  };

  const config = reportTypeConfig[source.reportType];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
        source.found ? "bg-secondary/20" : "bg-muted/50"
      } flex items-center justify-center`}>
        <Globe className={`w-4 h-4 ${source.found ? "text-secondary" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{source.name}</span>
          <Badge variant="outline" className={`text-xs ${config.color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
          {source.matchScore > 0 && (
            <span className="text-xs text-muted-foreground">
              {source.matchScore}% match
            </span>
          )}
        </div>
        {source.snippet && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {source.snippet}
          </p>
        )}
      </div>
    </div>
  );
};

const ScoreCard = ({ 
  label, 
  score, 
  findings 
}: { 
  label: string; 
  score: number; 
  findings: string[] 
}) => (
  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {score >= 70 ? (
          <TrendingUp className="w-4 h-4 text-success" />
        ) : score >= 50 ? (
          <AlertTriangle className="w-4 h-4 text-warning" />
        ) : (
          <TrendingDown className="w-4 h-4 text-destructive" />
        )}
        <span className={`font-semibold ${
          score >= 70 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive"
        }`}>
          {score}%
        </span>
      </div>
    </div>
    <Progress value={score} className="h-2 mb-3" />
    <ul className="space-y-1">
      {findings.map((finding, idx) => (
        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
          <span className="text-secondary">•</span>
          {finding}
        </li>
      ))}
    </ul>
  </div>
);

const AnalysisResultCard = ({ result, onClear, onViewDetails }: AnalysisResultCardProps) => {
  const config = verdictConfig[result.verdict];
  const VerdictIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto mt-6"
    >
      <div className={`${config.bgColor} ${config.borderColor} border rounded-2xl overflow-hidden shadow-2xl`}>
        {/* Header */}
        <div className="p-6 border-b border-border/30">
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
              className={`w-16 h-16 rounded-2xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}
            >
              <VerdictIcon className={`w-9 h-9 ${config.color}`} />
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className={`font-display text-2xl font-bold ${config.color}`}>
                  {config.label}
                </h3>
                <Badge variant={config.badgeVariant} className="text-sm">
                  {result.credibilityScore}% Credibility
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {config.description}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-card/50">
              <div className="text-2xl font-bold text-foreground">
                {result.sourceVerification.totalSourcesChecked}
              </div>
              <div className="text-xs text-muted-foreground">Sources Checked</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card/50">
              <div className="text-2xl font-bold text-success">
                {result.sourceVerification.confirmingSources}
              </div>
              <div className="text-xs text-muted-foreground">Confirming</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card/50">
              <div className="text-2xl font-bold text-destructive">
                {result.sourceVerification.disputingSources}
              </div>
              <div className="text-xs text-muted-foreground">Disputing</div>
            </div>
          </div>
        </div>

        {/* Tabs for detailed info */}
        <Tabs defaultValue="summary" className="p-6">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="summary" className="gap-2">
              <FileText className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-2">
              <Shield className="w-4 h-4" />
              Sources
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <Brain className="w-4 h-4" />
              AI Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="p-4 rounded-xl bg-card/50 border border-border/30">
              <p className="text-foreground leading-relaxed">{result.summary}</p>
            </div>
            
            <div className="p-4 rounded-xl bg-muted/30">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-secondary" />
                Recommendations
              </h4>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-secondary flex-shrink-0">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Cross-Platform Consistency
              </span>
              <span className={`font-semibold ${
                result.sourceVerification.crossPlatformConsistency >= 70 
                  ? "text-success" 
                  : result.sourceVerification.crossPlatformConsistency >= 50 
                  ? "text-warning" 
                  : "text-destructive"
              }`}>
                {result.sourceVerification.crossPlatformConsistency}%
              </span>
            </div>
            <Progress value={result.sourceVerification.crossPlatformConsistency} className="h-2 mb-4" />
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.sourceVerification.trustedSources.map((source, idx) => (
                <SourceItem key={idx} source={source} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <ScoreCard 
              label="Language Patterns" 
              score={result.aiAnalysis.languagePatterns.score}
              findings={result.aiAnalysis.languagePatterns.findings}
            />
            <ScoreCard 
              label="Claim Consistency" 
              score={result.aiAnalysis.claimConsistency.score}
              findings={result.aiAnalysis.claimConsistency.findings}
            />
            <ScoreCard 
              label={`Emotional Tone (${result.aiAnalysis.emotionalTone.tone})`}
              score={result.aiAnalysis.emotionalTone.score}
              findings={result.aiAnalysis.emotionalTone.findings}
            />
            <ScoreCard 
              label="Credibility Indicators" 
              score={result.aiAnalysis.credibilityIndicators.score}
              findings={result.aiAnalysis.credibilityIndicators.findings}
            />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={onViewDetails}
            className="flex-1 gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Report
          </Button>
          <Button
            variant="ghost"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground"
          >
            Analyze Another
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default AnalysisResultCard;
