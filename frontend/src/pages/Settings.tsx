import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Globe, Bell, Palette, Moon, Sun, 
  Check, Languages, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Language = "english" | "tamil";
type Theme = "light" | "dark";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  
  const [language, setLanguage] = useState<Language>("english");
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<Theme>("light");

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  useEffect(() => {
    // Check initial theme
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    toast({
      title: "Language Updated",
      description: `Language changed to ${lang === "english" ? "English" : "தமிழ் (Tamil)"}`,
    });
  };

  const handleNotificationToggle = (enabled: boolean) => {
    setNotifications(enabled);
    toast({
      title: enabled ? "Notifications Enabled" : "Notifications Disabled",
      description: enabled 
        ? "You will receive updates about your fact-checks" 
        : "You won't receive any notifications",
    });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast({
      title: "Theme Updated",
      description: `Switched to ${newTheme} mode`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Settings
                </h1>
                <p className="text-muted-foreground">
                  Customize your TruthLens experience
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Language Selection */}
              <Card className="border-border/50 shadow-soft">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10">
                      <Languages className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Language</CardTitle>
                      <CardDescription>
                        Choose your preferred language
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleLanguageChange("english")}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        language === "english"
                          ? "border-secondary bg-secondary/10"
                          : "border-border hover:border-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Globe className="w-5 h-5 text-secondary" />
                        {language === "english" && (
                          <Check className="w-4 h-4 text-secondary" />
                        )}
                      </div>
                      <div className="font-medium text-foreground">English</div>
                      <div className="text-sm text-muted-foreground">Default</div>
                    </button>
                    <button
                      onClick={() => handleLanguageChange("tamil")}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        language === "tamil"
                          ? "border-secondary bg-secondary/10"
                          : "border-border hover:border-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-secondary">த</span>
                        {language === "tamil" && (
                          <Check className="w-4 h-4 text-secondary" />
                        )}
                      </div>
                      <div className="font-medium text-foreground">தமிழ்</div>
                      <div className="text-sm text-muted-foreground">Tamil</div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="border-border/50 shadow-soft">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Bell className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Notifications</CardTitle>
                      <CardDescription>
                        Manage your notification preferences
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Bell className={`w-5 h-5 ${notifications ? "text-accent" : "text-muted-foreground"}`} />
                      <div>
                        <Label htmlFor="notifications" className="font-medium text-foreground cursor-pointer">
                          Push Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get alerts for fact-check results
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="notifications"
                      checked={notifications}
                      onCheckedChange={handleNotificationToggle}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Theme Selection */}
              <Card className="border-border/50 shadow-soft">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Palette className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Appearance</CardTitle>
                      <CardDescription>
                        Select your color theme
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleThemeChange("light")}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        theme === "light"
                          ? "border-secondary bg-secondary/10"
                          : "border-border hover:border-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Sun className="w-5 h-5 text-warning" />
                        {theme === "light" && (
                          <Check className="w-4 h-4 text-secondary" />
                        )}
                      </div>
                      <div className="font-medium text-foreground">Light Mode</div>
                      <div className="text-sm text-muted-foreground">Bright & clean</div>
                    </button>
                    <button
                      onClick={() => handleThemeChange("dark")}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        theme === "dark"
                          ? "border-secondary bg-secondary/10"
                          : "border-border hover:border-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Moon className="w-5 h-5 text-primary" />
                        {theme === "dark" && (
                          <Check className="w-4 h-4 text-secondary" />
                        )}
                      </div>
                      <div className="font-medium text-foreground">Dark Mode</div>
                      <div className="text-sm text-muted-foreground">Easy on the eyes</div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Logout */}
              <Card className="border-border/50 shadow-soft">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <LogOut className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Account</CardTitle>
                      <CardDescription>
                        Sign out of your account
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="w-full"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
