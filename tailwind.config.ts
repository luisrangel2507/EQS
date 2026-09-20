import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          DEFAULT: "#142B6B",
          50: "#EEF1FA",
          100: "#D6DCF1",
          200: "#AEB9E3",
          300: "#8697D5",
          400: "#5D74C7",
          500: "#3A50A8",
          600: "#233581",
          700: "#142B6B",
          800: "#0F2054",
          900: "#0A163C",
        },
        yellow: {
          DEFAULT: "#F4D935",
          50: "#FEFCEF",
          100: "#FDF7CE",
          200: "#FBEF9D",
          300: "#F9E76C",
          400: "#F6E04B",
          500: "#F4D935",
          600: "#DEBF15",
          700: "#B39A11",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Manrope", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
