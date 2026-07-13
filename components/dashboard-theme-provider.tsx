"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

export type DashboardTheme = "light" | "dark";

const STORAGE_KEY = "pupitar-dashboard-theme";

type DashboardThemeContextValue = {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
};

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<DashboardTheme>("dark");

  useLayoutEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeState(storedTheme);
    }
  }, []);

  function setTheme(nextTheme: DashboardTheme) {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <DashboardThemeContext.Provider value={{ theme, setTheme }}>
      <div
        className="pupitar-dashboard dashboard-developer-ui min-h-screen"
        data-dashboard-theme={theme}
      >
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);
  if (!context) {
    throw new Error("useDashboardTheme must be used inside DashboardThemeProvider");
  }
  return context;
}
