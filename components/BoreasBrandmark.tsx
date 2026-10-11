import OwlMark from "./OwlMark";

// Lockup de marca: ícono real (OwlMark, public/boreas-owl-mark.png) + texto
// "BOREAS" en Cormorant / "NFC HUB" en Inter mostaza debajo. El ícono ya
// viene en el color de marca (brick) sin importar el fondo, así que no
// necesita su propia variante light/dark — solo el texto la necesita.
interface BoreasBrandmarkProps {
  size?: "default" | "small";
  // "dark" (default): "BOREAS" en crema, para fondos oscuros — todo el resto
  // de la app. "light": "BOREAS" en tinta, para fondos claros (ej. la hoja
  // de impresión de QR, que es blanca).
  variant?: "dark" | "light";
}

export default function BoreasBrandmark({ size = "default", variant = "dark" }: BoreasBrandmarkProps) {
  const isSmall = size === "small";
  const isLight = variant === "light";

  return (
    <div className="flex items-center gap-2.5">
      <OwlMark size={isSmall ? 28 : 38} />
      <div className="leading-none">
        <p
          className={`font-cormorant font-bold ${isLight ? "text-boreas-ink" : "text-boreas-cream"} ${
            isSmall ? "text-lg" : "text-2xl"
          }`}
        >
          BOREAS
        </p>
        <p
          className={`mt-0.5 font-sans uppercase tracking-[0.25em] text-boreas-mustard ${
            isSmall ? "text-[9px]" : "text-[10px]"
          }`}
        >
          NFC HUB
        </p>
      </div>
    </div>
  );
}
