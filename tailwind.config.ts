import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        codex: {
          ink: "#1a1c1c",
          navy: "#0e3b69",
          blue: "#2c5282",
          muted: "#43474f",
          line: "#c3c6d0",
          paper: "#f9f9f9",
          chip: "#e2e2e2",
          softBlue: "#a5c8ff",
          softGreen: "#93d4af",
          softLavender: "#dde2f3",
          softRed: "#ffdad6"
        }
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Geist", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "ui-monospace", "SFMono-Regular"]
      },
      boxShadow: {
        codex: "0 4px 6px rgba(26, 32, 44, 0.05)",
        toast: "0 16px 40px rgba(26, 32, 44, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
