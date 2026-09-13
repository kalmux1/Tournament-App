/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: "#6B1728",
          50: "#fbe9ec",
          100: "#f4c3cb",
          600: "#6B1728",
          700: "#571020",
          800: "#420b18",
          900: "#2d0710",
        },
        gold: {
          DEFAULT: "#F59E0B",
          400: "#F5A623",
          500: "#F59E0B",
          600: "#d98705",
        },
        slate: {
          950: "#0F172A",
        },
      },
      fontFamily: {
        display: ['"Oswald"', "sans-serif"],
        sans: ['"Inter"', "sans-serif"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(245,158,11,0.5)" },
          "50%": { opacity: "0.85", boxShadow: "0 0 20px 4px rgba(245,158,11,0.35)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
}
