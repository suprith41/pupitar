import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#111114",
        panel: "#18171d",
        line: "#2a2832",
        ink: "#f2f0f5",
        muted: "#a9a4b5",
        accent: "#9b7ed8"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"]
      },
      borderRadius: {
        sm: "4px",
        md: "8px"
      }
    }
  },
  plugins: []
};

export default config;
