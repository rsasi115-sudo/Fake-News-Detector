import { motion } from "framer-motion";
import { FileText, Brain, Search, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Submit Content",
    description: "Paste a URL, upload an article, or enter text directly into our analyzer.",
    color: "bg-primary",
  },
  {
    icon: Brain,
    title: "NLP Analysis",
    description: "Our AI examines linguistic patterns, source credibility, and cross-references claims.",
    color: "bg-secondary",
  },
  {
    icon: Search,
    title: "Fact Verification",
    description: "We compare against trusted databases and verified news sources worldwide.",
    color: "bg-accent",
  },
  {
    icon: CheckCircle,
    title: "Get Results",
    description: "Receive a detailed credibility report with confidence scores and evidence.",
    color: "bg-success",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            How <span className="text-gradient">TruthLens</span> Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our advanced NLP pipeline analyzes content through multiple verification layers
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-border to-transparent" />
              )}

              <div className="gradient-card rounded-2xl p-6 shadow-soft border border-border/50 h-full hover:shadow-glow transition-shadow duration-300">
                {/* Step Number */}
                <div className="text-6xl font-display font-bold text-muted/50 absolute top-4 right-4">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl ${step.color} flex items-center justify-center mb-4`}>
                  <step.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                <h3 className="font-display text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
