import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidad de marca v2 ("plataforma" — ladrillo/mostaza/tinta
        // profunda, reemplaza el navy/cyan/violet anterior en TODO el
        // producto, no solo /admin). SOLO para acentos de marca (headers,
        // botones primarios, gradiente, focus rings) — no para indicar
        // estados, ver `status` abajo.
        //
        // Cada hex de acá está auditado contra las fórmula WCAG real (no a
        // ojo) contra los dos fondos oscuros del sistema (ink y surface):
        //   brick        #B5472E → SOLO fondo. Con texto blanco encima:
        //                  5.38:1 (botones sólidos). Como texto/borde sobre
        //                  ink/surface: 3.52/3.26 — falla AA de texto normal.
        //   brick-bright #D9694D → SOLO texto/borde/foco. 5.47:1 / 5.07:1
        //                  contra ink/surface — pasa AA. (Como fondo bajo
        //                  texto blanco da solo 3.46:1 — por eso NO se usa
        //                  como fondo, ni siquiera en degradado con brick:
        //                  ver btn-gradient-brand en globals.css, que por
        //                  esto quedó en ladrillo sólido + brillo, no
        //                  degradado de dos tonos.)
        //   mustard      #E3A72F → acento de detalle (foco, íconos, texto
        //                  secundario, estrellas). 8.86:1/8.21:1 como texto
        //                  — sobra. Como FONDO bajo texto claro falla fuerte
        //                  (2.14:1) — por eso el brief lo pide "solo para
        //                  detalles" y acá se respeta al pie de la letra:
        //                  mustard nunca lleva texto claro encima.
        boreas: {
          ink: "#14100E", // fondo profundo de toda la app (antes navy-deep)
          surface: "#1F1813", // superficie plana elevada (antes navy)
          brick: "#B5472E",
          "brick-bright": "#D9694D",
          mustard: "#E3A72F",
          cream: "#FBF7F1", // texto principal sobre fondo oscuro (antes white)
        },
        // Paleta semántica de estados: badges de billing_status, actividad
        // de chips, alertas. Separada de boreas.brick/mustard a propósito
        // para no mezclar "esto es de Boreas" con "esto necesita tu
        // atención" — mismo criterio que la v1.
        //
        // positive/positive-strong siguen el mismo patrón bg-safe/text-safe
        // que brick/brick-bright: la oliva base (#4F6B3A, "positive-strong")
        // da solo 3.15:1/2.92:1 como texto — falla — así que los badges
        // existentes (bg-status-positive/10 text-status-positive) usan la
        // variante clara (#6B8E4E, 5.05:1/4.68:1, pasa) como color por
        // defecto; positive-strong queda para si algún día se necesita un
        // fondo sólido "de éxito" con texto claro encima (6.01:1, pasa).
        // pending/negative no cambiaron: ya pasaban holgado (10.5+/6.3+)
        // contra los fondos nuevos, no había motivo para tocarlos.
        status: {
          positive: "#6B8E4E", // al_dia / chip activo (texto de badge)
          "positive-strong": "#4F6B3A", // fondo sólido, si hiciera falta
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
        // Entrada de panel de vidrio: el único momento de motion "de marca"
        // orquestado a propósito (login, tarjetas de éxito) — no es un
        // fade-and-slide genérico, lleva un settle de escala con curva
        // spring para sentirse como un material asentándose, no un div
        // apareciendo.
        "glass-in": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "glass-in": "glass-in 0.5s var(--ease-spring) both",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
      transitionTimingFunction: {
        // Aproximación a la curva "spring" que usa Apple en sus propias
        // superficies web (overshoot leve, no bounce de verdad) — ver
        // var(--ease-spring) en globals.css, misma curva como variable CSS
        // para poder usarla también en transiciones fuera de Tailwind.
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
