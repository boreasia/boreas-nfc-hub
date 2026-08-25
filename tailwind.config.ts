import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidad de marca: SOLO para acentos de marca (headers, botones
        // primarios, gradiente, focus rings) — no para indicar estados.
        boreas: {
          "navy-deep": "#0A1520",
          navy: "#1B2E44",
          cyan: "#4AB3E8",
          violet: "#7B4FBF",
        },
        // Paleta semántica de estados: badges de billing_status, actividad
        // de chips, alertas. Separada de boreas.cyan/violet a propósito para
        // no mezclar "esto es de Boreas" con "esto necesita tu atención".
        status: {
          positive: "#34D399", // al_dia / chip activo
          pending: "#FBBF24", // pendiente
          negative: "#F87171", // atrasado / alertas
        },
      },
      fontFamily: {
        cormorant: ["var(--font-cormorant)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
