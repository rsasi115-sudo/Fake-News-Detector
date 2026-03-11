import { motion } from "framer-motion";
import { Target, FileText, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  {
    icon: Target,
    value: "99.2%",
    label: "Detection Accuracy",
    description: "AI-powered precision",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: FileText,
    value: "10M+",
    label: "Total Articles Analyzed",
    description: "Growing daily",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: Clock,
    value: "< 30s",
    label: "Average Analysis Time",
    description: "Lightning-fast results",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

const DashboardMetrics = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-4">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-secondary">Platform Statistics</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Trusted by Millions
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our AI fact-checking platform delivers reliable results at scale
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-border/50 shadow-soft hover:shadow-glow transition-all duration-300 overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${metric.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                      <metric.icon className={`w-6 h-6 ${metric.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-3xl font-bold text-foreground mb-1">
                        {metric.value}
                      </div>
                      <div className="font-medium text-foreground mb-1">
                        {metric.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metric.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardMetrics;
