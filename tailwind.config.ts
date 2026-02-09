import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "#060a10",
          panel: "#0b1120",
          card: "#111a2e",
          hover: "#162040",
        },
        border: {
          DEFAULT: "#1a2744",
          bright: "#2a3f6a",
        },
        neon: {
          green: "#00ff88",
          red: "#ff3366",
          blue: "#00ccff",
          yellow: "#ffd000",
          purple: "#a855f7",
        },
        text: {
          primary: "#e2e8f0",
          secondary: "#8b9dc3",
          dim: "#4a5f8a",
        },
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
        "fade-in": "fade-in 0.35s ease-out both",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.75)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
