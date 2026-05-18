import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: "#FBF7EF",
          100: "#F5EEDF",
          200: "#EBE0C6",
          300: "#D9C9A3",
        },
        ink: {
          700: "#5C4632",
          800: "#3F2E1F",
          900: "#2A1E13",
        },
        accent: {
          DEFAULT: "#8B5E3C",
          dark: "#6B4423",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        serif: ["var(--font-noto-serif-kr)", "Noto Serif KR", "serif"],
      },
      boxShadow: {
        page: "0 1px 0 rgba(60,40,20,0.08), 0 12px 32px -16px rgba(60,40,20,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
