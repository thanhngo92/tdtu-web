import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import authService from "../services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const isAuthenticated = !!user;

  const fetchMe = useCallback(async () => {
    try {
      const response = await authService.getMe();
      const userData = response?.data ?? response ?? null;
      setUser(userData);
      return userData;
    } catch (error) {
      setUser(null);
      throw error;
    }
  }, []);

  const login = useCallback(
    async (payload) => {
      const response = await authService.login(payload);

      try {
        const me = await fetchMe();
        return {
          success: true,
          user: me,
          response,
        };
      } catch (error) {
        setUser(null);
        throw error;
      }
    },
    [fetchMe]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      await fetchMe();
    } catch {
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Sync user preferences to the DOM globally
  useEffect(() => {
    if (user && user.preferences) {
      // Handle theme
      if (user.preferences.theme === "dark") {
        document.body.classList.add("dark-theme");
      } else {
        document.body.classList.remove("dark-theme");
      }

      // Handle font size
      if (user.preferences.fontSize) {
        document.documentElement.style.setProperty("--global-font-size", `${user.preferences.fontSize}px`);
      }

      // Handle global note coloring or accents
      if (user.preferences.noteColor) {
        document.documentElement.setAttribute("data-note-color", user.preferences.noteColor);
      }
    } else {
      // Revert to defaults if unauthenticated
      document.body.classList.remove("dark-theme");
      document.documentElement.style.removeProperty("--global-font-size");
      document.documentElement.removeAttribute("data-note-color");
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isAuthLoading,
      login,
      logout,
      fetchMe,
      refreshAuth,
    }),
    [user, isAuthenticated, isAuthLoading, login, logout, fetchMe, refreshAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}