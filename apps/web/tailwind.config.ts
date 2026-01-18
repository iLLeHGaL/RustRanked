import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Rust-inspired color palette
        rust: {
          50: "#fdf4f3",
          100: "#fce7e4",
          200: "#fad3ce",
          300: "#f5b4ab",
          400: "#ed897a",
          500: "#e16450",
          600: "#cd4832",
          700: "#ac3926",
          800: "#8e3323",
          900: "#762f23",
          950: "#40150e",
        },
        // Dark theme colors
        dark: {
          50: "#f6f6f7",
          100: "#e2e3e5",
          200: "#c5c6cb",
          300: "#a0a2a9",
          400: "#7c7e87",
          500: "#61636c",
          600: "#4d4e56",
          700: "#3f4046",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
