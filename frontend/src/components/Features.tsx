import { motion } from "framer-motion";
import {
  Globe,
  Zap,
  Shield,
  BarChart3,
  Languages,
  Clock,
  Database,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Real-Time Detection",
    description: "Instant analysis of news articles with sub-second response times.",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Cross-reference against international news sources and fact-checkers.",
  },
  {
    icon: Languages,
    title: "Multi-Language",
    description: "Support for 50+ languages with accurate translation and analysis.",
  },
  {
    icon: BarChart3,
    title: "Credibility Scoring",
    description: "Detailed breakdown of authenticity metrics and confidence levels.",
  },
  {
    icon: Database,
    title: "Source Verification",
    description: "Automated checks against our database of verified news sources.",
  },
  {
    icon: Shield,
    title: "Bias Detection",
    description: "Identify political bias and sensationalism in reporting.",
  },
  {
    icon: Clock,
    title: "Historical Context",
    description: "Compare against similar claims and their verification history.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Your searches are encrypted and never stored or shared.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Powerful Features for <span className="text-gradient">Truth Seekers</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to verify information and combat misinformation
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <div className="h-full gradient-card rounded-2xl p-6 shadow-soft border border-border/50 hover:border-secondary/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-secondary/10 transition-colors">
                  <feature.icon className="w-6 h-6 text-secondary" />
                </div>

                <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
