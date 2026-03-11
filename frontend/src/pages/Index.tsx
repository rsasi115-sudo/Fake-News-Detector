import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import DashboardMetrics from "@/components/DashboardMetrics";
import RealTimeNews from "@/components/RealTimeNews";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

const Index = () => {
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

export default Index;
