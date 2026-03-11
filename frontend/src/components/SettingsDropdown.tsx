import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, User, LogOut, Globe, Moon, Sun, Bell, 
  HelpCircle, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const SettingsDropdown = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const handleEditProfile = () => {
    toast({
      title: "Edit Profile",
      description: "Profile editing will be available soon."
    });
  };

  const handleLogout = () => {
    toast({
      title: "Logged Out",
      description: "You have been signed out successfully."
    });
    navigate("/");
  };

  const handleLanguageChange = () => {
    toast({
      title: "Language Settings",
      description: "Language selection will be available soon."
    });
  };

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
    toast({
      title: "Theme Changed",
      description: `Switched to ${newTheme} mode.`
    });
  };

  const handleNotifications = () => {
    toast({
      title: "Notification Settings",
      description: "Notification preferences will be available soon."
    });
  };

  const handleHelp = () => {
    toast({
      title: "Help & Support",
      description: "Opening help center..."
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        {/* Account Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Account
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleEditProfile} className="cursor-pointer">
            <User className="w-4 h-4 mr-3" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-3" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* Preferences Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Preferences
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleLanguageChange} className="cursor-pointer">
            <Globe className="w-4 h-4 mr-3" />
            <span>Language</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleThemeToggle} className="cursor-pointer">
            {theme === "dark" ? (
              <Sun className="w-4 h-4 mr-3" />
            ) : (
              <Moon className="w-4 h-4 mr-3" />
            )}
            <span>Theme ({theme === "dark" ? "Dark" : "Light"})</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleNotifications} className="cursor-pointer">
            <Bell className="w-4 h-4 mr-3" />
            <span>Notifications</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* Support Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Support
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleHelp} className="cursor-pointer">
            <HelpCircle className="w-4 h-4 mr-3" />
            <span>Help & Support</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsDropdown;
