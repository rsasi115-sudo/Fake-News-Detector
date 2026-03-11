import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DashboardMetrics from "@/components/DashboardMetrics";
import RealTimeNews from "@/components/RealTimeNews";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const MainApp = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <DashboardMetrics />
        <RealTimeNews />
        <HowItWorks />
        <Features />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default MainApp;
