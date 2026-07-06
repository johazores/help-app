import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep, watchful teal — the dominant surface.
        ink: {
          DEFAULT: "#0C3B3A",
          soft: "#0F4645",
          muted: "#10504E",
        },
        // Warm marigold — the human "still here / received" accent. Used sparingly.
        marigold: {
          DEFAULT: "#EBA13B",
          deep: "#C9812A",
          soft: "#F6D9A6",
        },
        sage: "#6F8F7E",
        paper: "#F6F3EC",
        card: "#FFFFFF",
        line: "#E7E1D5",
        body: "#233F3D",
        subtle: "#5C6B67",
        danger: "#B4462F",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1.1rem",
        "2xl": "1.6rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(12,59,58,0.04), 0 8px 24px rgba(12,59,58,0.06)",
        lift: "0 2px 4px rgba(12,59,58,0.06), 0 18px 48px rgba(12,59,58,0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.2,0.7,0.2,1) both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
