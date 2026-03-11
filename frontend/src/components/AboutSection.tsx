import { motion } from "framer-motion";
import { 
  Shield, Brain, FileText, Image, Video, Mic, 
  Link, Users, GraduationCap, Newspaper, Search,
  Scale, CheckCircle2
} from "lucide-react";

const AboutSection = () => {
  const features = [
    {
      icon: FileText,
      title: "Text Analysis",
      description: "Advanced NLP algorithms analyze written content for misinformation patterns, bias, and factual inconsistencies."
    },
    {
      icon: Link,
      title: "URL Verification",
      description: "Automatically crawl and verify linked sources, checking domain credibility and cross-referencing claims."
    },
    {
      icon: Image,
      title: "Image Detection",
      description: "Reverse image search and manipulation detection to identify doctored or out-of-context visuals."
    },
    {
      icon: Video,
      title: "Video Analysis",
      description: "Frame-by-frame analysis to detect deepfakes, spliced content, and misleading video edits."
    },
    {
      icon: Mic,
      title: "Audio Verification",
      description: "Voice pattern analysis and audio forensics to identify synthetic or manipulated audio content."
    },
    {
      icon: Scale,
      title: "Bias Detection",
      description: "Identify political, emotional, and commercial bias in content presentation and framing."
    }
  ];

  const targetUsers = [
    {
      icon: GraduationCap,
      title: "Students & Researchers",
      description: "Verify sources for academic papers and research projects with confidence."
    },
    {
      icon: Newspaper,
      title: "Journalists & Media",
      description: "Fact-check stories and sources before publication to maintain credibility."
    },
    {
      icon: Users,
      title: "General Public",
      description: "Make informed decisions about the news and information you consume daily."
    }
  ];

  return (
    <section id="about" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
            <Shield className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-secondary">About TruthLens</span>
          </div>
          
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
            Fighting Misinformation with{" "}
            <span className="text-gradient">AI Technology</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            TruthLens is an AI-powered platform dedicated to detecting fake news and misinformation. 
            Using advanced Natural Language Processing (NLP) and machine learning algorithms, we analyze 
            content across multiple formats to provide accurate credibility assessments, helping you 
            make informed decisions in an era of information overload.
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="gradient-glass rounded-3xl p-8 md:p-12 shadow-soft border border-border/50 mb-16"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                <Brain className="w-12 h-12 text-secondary-foreground" />
              </div>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold font-display mb-4">Our Mission</h3>
              <p className="text-muted-foreground leading-relaxed">
                In today's digital landscape, misinformation spreads faster than ever. Our mission is to 
                empower individuals with the tools they need to verify information, understand source 
                credibility, and recognize bias. We believe that access to truthful information is 
                fundamental to a healthy society, and we're committed to making fact-checking accessible, 
                fast, and reliable for everyone.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Analysis Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold font-display text-center mb-8">
            What We Analyze
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Key Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold font-display text-center mb-8">
            Why Choose TruthLens?
          </h3>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              "Credibility scoring with detailed explanations",
              "Source verification against trusted databases",
              "Real-time bias detection and classification",
              "Historical claim comparison and consistency checks",
              "Multi-format analysis: text, images, video, audio",
              "Privacy-focused with no data retention"
            ].map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/20"
              >
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-foreground">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Target Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold font-display text-center mb-8">
            Who We Serve
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {targetUsers.map((user, index) => (
              <motion.div
                key={user.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-8 rounded-2xl gradient-glass border border-border/50 shadow-soft"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                  <user.icon className="w-8 h-8 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">{user.title}</h4>
                <p className="text-sm text-muted-foreground">{user.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
