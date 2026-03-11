import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Download, Share2, Printer, 
  CheckCircle, XCircle, AlertTriangle, 
  FileText, TrendingUp, BarChart3, PieChart,
  Quote, Highlighter, Scale, History, Globe,
  BookOpen, Shield, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, 
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, CartesianGrid, Tooltip, Legend
} from "recharts";

// Mock detailed analysis data
const mockReport = {
  verdict: "fake" as const,
  confidence: 87.3,
  title: "Breaking: Scientists Discover New Element That Cures All Diseases",
  analyzedUrl: "https://example-news.com/article/12345",
  timestamp: new Date().toISOString(),
  wordCount: 847,
  readingTime: "4 min",
  
  // Full text with sentence-level highlights
  fullText: [
    { text: "Scientists have made an unprecedented discovery that could change medicine forever.", type: "sensational" as const },
    { text: "A new element, temporarily named 'Healium', has shown remarkable properties in preliminary tests.", type: "unverified" as const },
    { text: "Dr. John Smith, who wishes to remain anonymous, stated that this breakthrough will cure all known diseases.", type: "questionable" as const },
    { text: "The research was conducted at an undisclosed laboratory in Eastern Europe.", type: "vague" as const },
    { text: "Initial trials on mice showed 100% success rate with no side effects whatsoever.", type: "exaggerated" as const },
    { text: "Pharmaceutical companies are reportedly in panic mode as this discovery could make all their products obsolete.", type: "emotional" as const },
    { text: "The scientific community has not yet verified these claims, but social media is already celebrating.", type: "neutral" as const },
    { text: "Experts predict this could be the most significant medical discovery in human history.", type: "sensational" as const },
  ],

  // Bias indicators
  biasIndicators: [
    { category: "Political Bias", score: 23, direction: "Neutral" },
    { category: "Emotional Language", score: 78, direction: "High" },
    { category: "Clickbait Score", score: 92, direction: "Very High" },
    { category: "Scientific Accuracy", score: 15, direction: "Very Low" },
    { category: "Source Transparency", score: 18, direction: "Very Low" },
  ],

  // Historical claims comparison
  historicalClaims: [
    { claim: "Miracle cure for all diseases", frequency: 847, debunked: true, year: "2020-2024" },
    { claim: "Anonymous scientist discovery", frequency: 1203, debunked: true, year: "2019-2024" },
    { claim: "Big pharma conspiracy", frequency: 2341, debunked: true, year: "2018-2024" },
    { claim: "100% success rate claims", frequency: 567, debunked: true, year: "2021-2024" },
  ],

  // Source credibility scores
  sourceCredibility: [
    { source: "Publication Domain", score: 12, maxScore: 100 },
    { source: "Author Credentials", score: 0, maxScore: 100 },
    { source: "Citation Quality", score: 8, maxScore: 100 },
    { source: "Fact-Check History", score: 5, maxScore: 100 },
    { source: "Domain Age", score: 25, maxScore: 100 },
  ],

  // Confidence distribution
  confidenceDistribution: [
    { name: "Fake", value: 87.3, color: "hsl(var(--destructive))" },
    { name: "Uncertain", value: 8.2, color: "hsl(var(--warning))" },
    { name: "Real", value: 4.5, color: "hsl(var(--success))" },
  ],

  // Verification timeline
  verificationResults: [
    { step: "Claim 1", verified: false, confidence: 95 },
    { step: "Claim 2", verified: false, confidence: 88 },
    { step: "Claim 3", verified: false, confidence: 92 },
    { step: "Source Check", verified: false, confidence: 97 },
    { step: "Expert Quote", verified: false, confidence: 100 },
  ],

  // Radar chart data
  radarData: [
    { subject: "Credibility", A: 15, fullMark: 100 },
    { subject: "Accuracy", A: 12, fullMark: 100 },
    { subject: "Transparency", A: 18, fullMark: 100 },
    { subject: "Objectivity", A: 22, fullMark: 100 },
    { subject: "Sources", A: 8, fullMark: 100 },
    { subject: "Verifiability", A: 10, fullMark: 100 },
  ],
};

const getHighlightColor = (type: string) => {
  switch (type) {
    case "sensational":
      return "bg-destructive/20 border-destructive/40";
    case "unverified":
      return "bg-warning/20 border-warning/40";
    case "questionable":
      return "bg-destructive/15 border-destructive/30";
    case "vague":
      return "bg-warning/15 border-warning/30";
    case "exaggerated":
      return "bg-destructive/25 border-destructive/50";
    case "emotional":
      return "bg-warning/20 border-warning/40";
    case "neutral":
      return "bg-muted/50 border-border";
    default:
      return "bg-muted/50 border-border";
  }
};

const getHighlightLabel = (type: string) => {
  switch (type) {
    case "sensational":
      return { label: "Sensational", color: "text-destructive" };
    case "unverified":
      return { label: "Unverified", color: "text-warning" };
    case "questionable":
      return { label: "Questionable", color: "text-destructive" };
    case "vague":
      return { label: "Vague", color: "text-warning" };
    case "exaggerated":
      return { label: "Exaggerated", color: "text-destructive" };
    case "emotional":
      return { label: "Emotional", color: "text-warning" };
    case "neutral":
      return { label: "Neutral", color: "text-muted-foreground" };
    default:
      return { label: "Unknown", color: "text-muted-foreground" };
  }
};

const chartConfig = {
  value: { label: "Score" },
  score: { label: "Score" },
  A: { label: "Score", color: "hsl(var(--secondary))" },
};

const DetailedReport = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate("/results")}
                className="w-fit gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Results
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <Badge className="bg-destructive text-destructive-foreground mb-2">
                  Fake News Detected
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display mb-2">
                  Detailed Analysis Report
                </h1>
                <p className="text-muted-foreground text-sm">
                  Comprehensive breakdown of the fact-checking analysis • {mockReport.wordCount} words • {mockReport.readingTime} read
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tabs Navigation */}
          <Tabs defaultValue="text-analysis" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2 bg-muted/50 p-2">
                <TabsTrigger value="text-analysis" className="gap-2 py-3">
                  <Highlighter className="w-4 h-4" />
                  <span className="hidden sm:inline">Text Analysis</span>
                  <span className="sm:hidden">Text</span>
                </TabsTrigger>
                <TabsTrigger value="bias" className="gap-2 py-3">
                  <Scale className="w-4 h-4" />
                  <span className="hidden sm:inline">Bias Detection</span>
                  <span className="sm:hidden">Bias</span>
                </TabsTrigger>
                <TabsTrigger value="historical" className="gap-2 py-3">
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">Historical</span>
                  <span className="sm:hidden">History</span>
                </TabsTrigger>
                <TabsTrigger value="sources" className="gap-2 py-3">
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">Source Check</span>
                  <span className="sm:hidden">Sources</span>
                </TabsTrigger>
                <TabsTrigger value="charts" className="gap-2 py-3">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                  <span className="sm:hidden">Charts</span>
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Text Analysis Tab */}
            <TabsContent value="text-analysis" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-secondary" />
                      Sentence-Level Analysis
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Each sentence is analyzed and highlighted based on detected issues
                    </p>
                  </CardHeader>
                  <CardContent>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded bg-destructive/30" />
                        <span>Sensational/Exaggerated</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded bg-warning/30" />
                        <span>Unverified/Vague</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded bg-muted" />
                        <span>Neutral</span>
                      </div>
                    </div>

                    {/* Analyzed Text */}
                    <div className="space-y-3">
                      {mockReport.fullText.map((sentence, index) => {
                        const highlight = getHighlightLabel(sentence.type);
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 rounded-lg border-l-4 ${getHighlightColor(sentence.type)}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <Quote className="w-4 h-4 text-muted-foreground mb-2" />
                                <p className="text-foreground">{sentence.text}</p>
                              </div>
                              <Badge variant="outline" className={`${highlight.color} flex-shrink-0`}>
                                {highlight.label}
                              </Badge>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Bias Detection Tab */}
            <TabsContent value="bias" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="shadow-soft h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-secondary" />
                        Bias Indicators
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockReport.biasIndicators.map((indicator, index) => (
                          <motion.div
                            key={indicator.category}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">{indicator.category}</span>
                              <span className={`text-sm font-bold ${
                                indicator.score > 70 ? "text-destructive" :
                                indicator.score > 40 ? "text-warning" : "text-success"
                              }`}>
                                {indicator.direction}
                              </span>
                            </div>
                            <Progress value={indicator.score} className="h-2" />
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="shadow-soft h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-secondary" />
                        Credibility Radar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <RadarChart data={mockReport.radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          />
                          <Radar
                            name="Score"
                            dataKey="A"
                            stroke="hsl(var(--secondary))"
                            fill="hsl(var(--secondary))"
                            fillOpacity={0.3}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RadarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            {/* Historical Claims Tab */}
            <TabsContent value="historical" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5 text-secondary" />
                      Historical Claim Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Similar claims that have been fact-checked in our database
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockReport.historicalClaims.map((claim, index) => (
                        <motion.div
                          key={claim.claim}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <XCircle className="w-4 h-4 text-destructive" />
                                <span className="font-medium text-foreground">{claim.claim}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Found in {claim.frequency.toLocaleString()} articles ({claim.year})
                              </p>
                            </div>
                            <Badge className="bg-destructive/10 text-destructive border-destructive/30 w-fit">
                              Previously Debunked
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Source Credibility Tab */}
            <TabsContent value="sources" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="shadow-soft h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-secondary" />
                        Source Credibility Scores
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <BarChart 
                          data={mockReport.sourceCredibility} 
                          layout="vertical"
                          margin={{ left: 100 }}
                        >
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis 
                            type="category" 
                            dataKey="source" 
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="score" 
                            fill="hsl(var(--destructive))" 
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="shadow-soft h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-secondary" />
                        Verification Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockReport.verificationResults.map((result, index) => (
                          <motion.div
                            key={result.step}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-3"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              result.verified ? "bg-success/20" : "bg-destructive/20"
                            }`}>
                              {result.verified ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                              ) : (
                                <XCircle className="w-5 h-5 text-destructive" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{result.step}</p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {result.confidence}% certain
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            {/* Charts & Analytics Tab */}
            <TabsContent value="charts" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-secondary" />
                        Confidence Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <RechartsPieChart>
                          <Pie
                            data={mockReport.confidenceDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}%`}
                          >
                            {mockReport.confidenceDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RechartsPieChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-secondary" />
                        Detection Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <BarChart data={mockReport.biasIndicators}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="category" 
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="score" 
                            fill="hsl(var(--secondary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Summary Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="shadow-soft">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-destructive font-display">87.3%</div>
                        <p className="text-sm text-muted-foreground">Fake Probability</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-warning font-display">6/8</div>
                        <p className="text-sm text-muted-foreground">Red Flags Found</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground font-display">0/5</div>
                        <p className="text-sm text-muted-foreground">Claims Verified</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-secondary font-display">12%</div>
                        <p className="text-sm text-muted-foreground">Source Trust</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Bottom Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row justify-center gap-4"
          >
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              Check Another Article
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Learn About Our Methodology
            </Button>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DetailedReport;
