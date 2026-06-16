/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8ec",
          100: "#ffefd1",
          200: "#ffdca3",
          300: "#ffc265",
          400: "#ff9d2a",
          500: "#ff7e0f",
          600: "#f25f05",
          700: "#c84808",
          800: "#9e390e",
          900: "#7f300f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
