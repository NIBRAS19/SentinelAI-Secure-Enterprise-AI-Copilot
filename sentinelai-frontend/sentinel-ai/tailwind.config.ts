import type { Config } from "tailwindcss";

// Design tokens for SentinelAI. Named deliberately (not Tailwind's default
// palette) so they read as intentional choices and never collide with
// stock utilities like `blue-500`. See README → Design system.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0E13", // app background
        panel: "#131922", // raised surface (cards, sidebar, table head)
        "panel-raised": "#1A2129", // hover / active surface
        line: "#242C38", // hairline borders and dividers
        paper: "#ECEEF2", // primary text
        mute: "#8B93A3", // secondary text
        faint: "#57606F", // tertiary / placeholder text
        gold: "#C9962B", // governance accent: signed-off, approved, brand
        signal: "#5B8CFF", // intelligence accent: AI, retrieval, links
        "status-safe": "#3FB27F",
        "status-warn": "#E1883D",
        "status-critical": "#E5484D",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        none: "none",
      },
      keyframes: {
        "line-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "line-in": "line-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
