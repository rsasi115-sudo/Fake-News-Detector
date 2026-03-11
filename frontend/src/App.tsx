import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SearchHistoryProvider } from "@/contexts/SearchHistoryContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import MainApp from "./pages/MainApp";
import Auth from "./pages/Auth";
import AnalysisResults from "./pages/AnalysisResults";
import DetailedReport from "./pages/DetailedReport";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SearchHistoryProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/analyze" element={<MainApp />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/results" element={<AnalysisResults />} />
              <Route path="/report" element={<DetailedReport />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SearchHistoryProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
