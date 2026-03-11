import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { Menu, X, Settings } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RecentSearchesPanel from "./RecentSearchesPanel";
import { useSearchHistory } from "@/contexts/SearchHistoryContext";
import type { SearchHistoryItem } from "@/contexts/SearchHistoryContext";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setSelectedHistoryItem, setNewAnalysisRequested } = useSearchHistory();

  const handleHistorySelect = (item: SearchHistoryItem) => {
    if (location.pathname !== "/analyze") {
      navigate("/analyze");
    }
    setSelectedHistoryItem(item);
  };

  const handleNewProject = () => {
    if (location.pathname !== "/analyze") {
      navigate("/analyze");
    }
    setNewAnalysisRequested(true);
  };

  const navLinks = [
    { label: "How it Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "About", href: "#about" },
  ];

  const handleNavClick = (href: string) => {
    const element = document.querySelector(href);
    element?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 gradient-glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <RecentSearchesPanel 
              onSelectHistory={handleHistorySelect}
              onNewProject={handleNewProject}
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <RecentSearchesPanel 
              onSelectHistory={handleHistorySelect}
              onNewProject={handleNewProject}
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden gradient-glass border-t border-border/50"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 text-left"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
