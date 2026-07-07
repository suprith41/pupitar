import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#FFFFFF",
        panel: "#F3F4F6",
        line: "#E5E7EB",
        ink: "#111111",
        muted: "#6B7280",
        accent: "#4F46E5"
      },
      fontFamily: {
        sans: ["Source Serif 4", "Georgia", "serif"],
        heading: ["Fredericka the Great", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"]
      },
      borderRadius: {
        sm: "4px",
        md: "4px"
      }
    }
  },
  plugins: []
};

export default config;
