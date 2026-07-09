import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#FFFFFF",
        bg: "#FCFBF7",
        panel: "#FFFFFF",
        line: "#E1E4EA",
        ink: "#000000",
        muted: "#706E6E",
        accent: "#2067FF",
        "accent-hover": "#2F6BFF",
        nav: "#0E1116",
        error: "#B42318",
        success: "#1D7F4D"
      },
      fontFamily: {
        sans: ["DM Sans", "Arial", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "serif"],
        heading: ["DM Sans", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
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
        card: "0 10px 24px rgba(0, 11, 28, 0.06)",
        elevated: "0 18px 34px rgba(0, 11, 28, 0.12)",
        blue: "0 10px 24px rgba(32, 103, 255, 0.18)",
        zf: "0 10px 24px rgba(0, 11, 28, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
