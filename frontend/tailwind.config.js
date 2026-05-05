/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0b",
        panel: "#111114",
        "panel-2": "#16161a",
        edge: "#26262c",
        "edge-bright": "#3a3a42",
        primary: "#e7e7ea",
        secondary: "#a0a0a8",
        muted: "#6b6b75",
        accent: {
          DEFAULT: "#f59e0b",
          soft: "#fcd34d",
          dim: "#b45309",
        },
        ok: "#34d399",
        warn: "#fbbf24",
        bad: "#f87171",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(245, 158, 11, 0.4), 0 0 18px -6px rgba(245, 158, 11, 0.45)",
      },
    },
  },
  plugins: [],
};
