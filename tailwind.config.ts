import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#FFFFFF",
        bg: "#F5F0E8",
        panel: "#EDE9E0",
        line: "#D6D0C4",
        ink: "#111111",
        muted: "#6B7280",
        accent: "#3B5CFF",
        "accent-hover": "#2A47E0",
        nav: "#0D1117",
        error: "#DC2626",
        success: "#16A34A"
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"]
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "9999px"
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0, 0, 0, 0.06)",
        card: "0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)",
        elevated: "0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
        blue: "0 4px 14px rgba(59, 92, 255, 0.3)"
      }
    }
  },
  plugins: []
};

export default config;
