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
          // Variante clara de violet, solo para texto/bordes/focus-rings sobre
          // fondo oscuro. boreas.violet normal (#7B4FBF) da 2.44:1 contra
          // boreas.navy y 3.25:1 contra navy-deep — falla AA (4.5:1) como
          // texto real en ambos, y ni siquiera llega al mínimo de 3:1 para
          // bordes/foco en navy. Auditoría real (fórmula WCAG, no a ojo):
          // #A78BFA da 5.07:1 / 6.76:1 contra los mismos dos fondos. Sigue
          // siendo "violeta de marca" — no es un color nuevo inventado, es el
          // violet-400 de la paleta estándar de Tailwind. violet (el oscuro)
          // se deja intacto donde se usa como FONDO (bg-boreas-violet,
          // gradientes) — ahí el contraste lo define el texto blanco encima
          // (5.66:1, ya pasa), no este token.
          "violet-bright": "#A78BFA",
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
