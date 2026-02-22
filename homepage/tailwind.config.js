/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: "#7D9A8E",
        "sage-light": "#A1CDB9",
        "bg-base": "#0B0B0B",
        "bg-panel": "#111317",
        "bg-card": "#1a1a1a",
        border: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
