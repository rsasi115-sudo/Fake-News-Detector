import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CheckCircle, XCircle, AlertTriangle, ArrowLeft, 
  Download, RefreshCw, Shield, AlertOctagon,
  Globe, BookOpen, Zap, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShareDropdown from "@/components/ShareDropdown";

// Mock analysis data - in production this would come from an API
const mockAnalysis = {
  verdict: "fake" as "real" | "fake" | "uncertain",
  confidence: 87.3,
  title: "Breaking: Scientists Discover New Element That Cures All Diseases",
  analyzedUrl: "https://example-news.com/article/12345",
  timestamp: new Date().toISOString(),
  aiExplanation: "This article exhibits multiple characteristics commonly associated with misinformation. The headline uses sensationalist language ('cures all diseases') which is a red flag for credibility. No credible scientific sources are cited, and the claims made are not supported by peer-reviewed research. The article also lacks author attribution and uses emotional manipulation techniques.",
  keySignals: [
    { name: "Sensational Language", score: 92, status: "high" as const, description: "Headline uses extreme claims without evidence" },
    { name: "Source Credibility", score: 23, status: "low" as const, description: "Unknown publication with no verification" },
    { name: "Bias Detection", score: 78, status: "high" as const, description: "Strong emotional and political bias detected" },
    { name: "Historical Consistency", score: 34, status: "low" as const, description: "Claims contradict established scientific consensus" },
    { name: "Factual Accuracy", score: 18, status: "low" as const, description: "Multiple unverifiable claims identified" },
    { name: "Writing Quality", score: 45, status: "medium" as const, description: "Grammatical issues and informal tone" },
  ],
  sourceVerification: {
    matched: [
      { name: "Associated Press", status: "not_found" as const },
      { name: "Reuters", status: "not_found" as const },
      { name: "WHO Official Sources", status: "not_found" as const },
    ],
    missing: [
      "No peer-reviewed citations",
      "No expert quotes verified",
      "Publication not in trusted database",
    ],
  },
};

const getVerdictConfig = (verdict: "real" | "fake" | "uncertain") => {
  switch (verdict) {
    case "real":
      return {
        icon: CheckCircle,
        label: "Credible News",
        color: "text-success",
        bgColor: "bg-success/10",
        borderColor: "border-success/30",
        badgeClass: "bg-success text-success-foreground",
      };
    case "fake":
      return {
        icon: XCircle,
        label: "Fake News Detected",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
        badgeClass: "bg-destructive text-destructive-foreground",
      };
    case "uncertain":
      return {
        icon: AlertTriangle,
        label: "Uncertain / Needs Review",
        color: "text-warning",
        bgColor: "bg-warning/10",
        borderColor: "border-warning/30",
        badgeClass: "bg-warning text-warning-foreground",
      };
  }
};

const getSignalColor = (status: "high" | "medium" | "low") => {
  switch (status) {
    case "high":
      return "text-destructive";
    case "medium":
      return "text-warning";
    case "low":
      return "text-success";
  }
};

const AnalysisResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verdictConfig = getVerdictConfig(mockAnalysis.verdict);
  const VerdictIcon = verdictConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </motion.div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground font-display mb-2">
              Analysis Results
            </h1>
            <p className="text-muted-foreground">
              AI-powered fact-checking analysis completed
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Verdict Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className={`${verdictConfig.bgColor} ${verdictConfig.borderColor} border-2`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Verdict Icon & Label */}
                      <div className="flex items-center gap-4">
                        <div className={`w-20 h-20 rounded-full ${verdictConfig.bgColor} flex items-center justify-center`}>
                          <VerdictIcon className={`w-12 h-12 ${verdictConfig.color}`} />
                        </div>
                        <div>
                          <Badge className={`${verdictConfig.badgeClass} text-lg px-4 py-1 mb-2`}>
                            {verdictConfig.label}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            Analyzed at {new Date(mockAnalysis.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Confidence Score */}
                      <div className="flex-1 md:text-right">
                        <div className="inline-block">
                          <div className="text-4xl font-bold font-display text-foreground mb-1">
                            {mockAnalysis.confidence}%
                          </div>
                          <p className="text-sm text-muted-foreground">Confidence Score</p>
                          <div className="mt-2 w-48">
                            <Progress value={mockAnalysis.confidence} className="h-3" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Analyzed Content */}
                    <div className="mt-6 p-4 rounded-lg bg-background/50 border border-border">
                      <p className="text-sm text-muted-foreground mb-1">Analyzed Content:</p>
                      <p className="font-medium text-foreground">{mockAnalysis.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{mockAnalysis.analyzedUrl}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* AI Explanation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Zap className="w-5 h-5 text-secondary" />
                      AI Explanation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {mockAnalysis.aiExplanation}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Key Signals */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <AlertOctagon className="w-5 h-5 text-secondary" />
                      Key Detection Signals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {mockAnalysis.keySignals.map((signal, index) => (
                        <motion.div
                          key={signal.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">{signal.name}</span>
                            <span className={`font-bold ${getSignalColor(signal.status)}`}>
                              {signal.score}%
                            </span>
                          </div>
                          <Progress 
                            value={signal.score} 
                            className="h-2 mb-2"
                          />
                          <p className="text-xs text-muted-foreground">{signal.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Source Verification */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Globe className="w-5 h-5 text-secondary" />
                      Source Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Trusted Sources Checked
                        </h4>
                        <div className="space-y-2">
                          {mockAnalysis.sourceVerification.matched.map((source) => (
                            <div
                              key={source.name}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <span className="text-sm">{source.name}</span>
                              <Badge variant="outline" className="text-destructive border-destructive">
                                Not Found
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          Missing Verification
                        </h4>
                        <ul className="space-y-2">
                          {mockAnalysis.sourceVerification.missing.map((item, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-6">
              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full gap-2"
                      onClick={() => navigate("/")}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Check Another News
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full gap-2"
                      onClick={() => navigate("/report")}
                    >
                      <Eye className="w-4 h-4" />
                      View Detailed Report
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Report
                    </Button>
                    <ShareDropdown />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="shadow-soft gradient-card">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <BookOpen className="w-10 h-10 text-secondary mx-auto mb-3" />
                      <h4 className="font-semibold text-foreground mb-1">Learn More</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Understand how our AI detects misinformation
                      </p>
                      <Button variant="link" className="text-secondary">
                        View Methodology →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AnalysisResults;
