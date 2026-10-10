/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#07090e",
        panel: {
          DEFAULT: "rgba(13, 17, 26, 0.75)",
          secondary: "#0b111c",
          border: "rgba(0, 240, 255, 0.12)",
        },
        accent: {
          cyan: "#00f0ff",
          blue: "#0ea5e9",
        },
        status: {
          present: "#10b981",
          late: "#eab308",
          absent: "#ef4444",
          denied: "#ef4444",
          info: "#38bdf8",
          muted: "#64748b",
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
          muted: "#64748b",
        }
      },
      fontFamily: {
        heading: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(0, 240, 255, 0.3)',
        'glow-cyan-sm': '0 0 8px 0px rgba(0, 240, 255, 0.25)',
        'panel': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
