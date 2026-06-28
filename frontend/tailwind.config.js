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
        // Verde "fresco" para éxito / disponible / entregado
        success: {
          50: "#ecfdf3",
          100: "#d1fadf",
          200: "#a6f4c5",
          300: "#6ce9a6",
          400: "#32d583",
          500: "#12b76a",
          600: "#039855",
          700: "#027a48",
          800: "#05603a",
          900: "#054f31",
        },
        // Ámbar para advertencias / pendiente / en preparación
        warn: {
          50: "#fffaeb",
          100: "#fef0c7",
          200: "#fedf89",
          300: "#fec84b",
          400: "#fdb022",
          500: "#f79009",
          600: "#dc6803",
          700: "#b54708",
          800: "#93370d",
          900: "#7a2e0e",
        },
        // Rojo coral para error / cancelado / destructivo (más cálido que red-500)
        danger: {
          50: "#fef3f2",
          100: "#fee4e2",
          200: "#fecdca",
          300: "#fda29b",
          400: "#f97066",
          500: "#f04438",
          600: "#d92d20",
          700: "#b42318",
          800: "#912018",
          900: "#7a271a",
        },
        // Azul informativo / enlaces secundarios / estado "en camino"
        info: {
          50: "#eff8ff",
          100: "#d1e9ff",
          200: "#b2ddff",
          300: "#84caff",
          400: "#53b1fd",
          500: "#2e90fa",
          600: "#1570ef",
          700: "#175cd3",
          800: "#1849a9",
          900: "#194185",
        },
        // Gris CÁLIDO (tinte hacia el naranja) — superficies y textos neutros.
        ink: {
          50: "#faf9f7",
          100: "#f4f2ee",
          200: "#e8e4dd",
          300: "#d6d0c6",
          400: "#a8a097",
          500: "#7a7268",
          600: "#5c554c",
          700: "#433d36",
          800: "#2b2723",
          900: "#1a1714",
        },
      },
      // Superficies semánticas (tokens de fondo):
      backgroundColor: {
        surface: "#ffffff",
        "surface-muted": "#faf9f7", // = ink-50
        "surface-sunken": "#f4f2ee", // = ink-100
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(26 23 20 / 0.04), 0 2px 8px -2px rgb(26 23 20 / 0.06)",
        "card-hover":
          "0 4px 12px -2px rgb(26 23 20 / 0.10), 0 8px 24px -4px rgb(26 23 20 / 0.12)",
        pop: "0 8px 28px -6px rgb(26 23 20 / 0.18), 0 16px 48px -12px rgb(26 23 20 / 0.20)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
      },
    },
  },
  plugins: [],
};
