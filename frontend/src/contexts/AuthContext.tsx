import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  hasTokens,
  storeTokens,
  clearTokens,
  fetchMe,
  type AuthUser,
} from "@/lib/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  /** Call after a successful signup/login API response to persist tokens. */
  loginWithTokens: (access: string, refresh: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if we have a valid access token by calling /auth/me
  useEffect(() => {
    if (!hasTokens()) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
          setIsAuthenticated(true);
        } else {
          // Token expired / invalid → clear
          clearTokens();
        }
      })
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const loginWithTokens = (access: string, refresh: string, userData: AuthUser) => {
    storeTokens(access, refresh);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, loginWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
