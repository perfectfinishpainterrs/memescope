import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "#030608",
          panel: "#070d18",
          card: "#0c1424",
          hover: "#0f1a30",
        },
        border: {
          DEFAULT: "#121e36",
          bright: "#1a2f55",
        },
        neon: {
          green: "#00ff88",
          cyan: "#00e5ff",
          magenta: "#ff00aa",
          red: "#ff3366",
          blue: "#00ccff",
          yellow: "#ffd000",
          purple: "#a855f7",
        },
        text: {
          primary: "#c8d6e5",
          secondary: "#6b7fa3",
          dim: "#3a4d70",
        },
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.35s ease-out both",
        "flash-green": "flash-green 0.8s ease-out",
        "flash-red": "flash-red 0.8s ease-out",
        "neon-shimmer": "neon-shimmer 2s linear infinite",
        "border-glow": "border-glow 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.3", transform: "scale(0.6)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0,255,136,0.3), 0 0 15px rgba(0,255,136,0.1)" },
          "50%": { boxShadow: "0 0 12px rgba(0,255,136,0.5), 0 0 30px rgba(0,255,136,0.2)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "flash-green": {
          "0%": { backgroundColor: "rgba(0,255,136,0.15)" },
          "100%": { backgroundColor: "transparent" },
        },
        "flash-red": {
          "0%": { backgroundColor: "rgba(255,51,102,0.15)" },
          "100%": { backgroundColor: "transparent" },
        },
        "neon-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "#121e36" },
          "50%": { borderColor: "rgba(0,255,136,0.4)" },
        },
      },
      boxShadow: {
        "neon-green": "0 0 10px rgba(0,255,136,0.3), 0 0 30px rgba(0,255,136,0.1)",
        "neon-green-lg": "0 0 15px rgba(0,255,136,0.4), 0 0 45px rgba(0,255,136,0.15)",
        "neon-cyan": "0 0 10px rgba(0,229,255,0.3), 0 0 30px rgba(0,229,255,0.1)",
        "neon-magenta": "0 0 10px rgba(255,0,170,0.3), 0 0 30px rgba(255,0,170,0.1)",
        "neon-red": "0 0 10px rgba(255,51,102,0.3), 0 0 30px rgba(255,51,102,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
