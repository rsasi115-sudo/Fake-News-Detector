import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Shield } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header - Logo only */}
      <header className="fixed top-0 left-0 right-0 z-50 gradient-glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Logo />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center pt-16"
        style={{
          backgroundImage: `linear-gradient(to bottom, hsl(var(--background)/0.85), hsl(var(--background)/0.95)), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
              <Shield className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">AI-Powered Fact Checking</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Detect Fake News
              <br />
              <span className="text-gradient">Before It Spreads</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              TruthLens uses advanced AI to analyze news articles, social media posts, and claims
              in real-time. Get instant credibility scores and detailed verification reports.
            </p>

            <Button
              variant="hero"
              size="xl"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto"
            >
              Get Started
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
