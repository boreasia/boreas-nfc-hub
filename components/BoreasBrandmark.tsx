// No existe un logo de Boreas en el proyecto (verificado: no hay public/ ni
// app/icon.tsx), así que este es el lockup de texto que hace de marca:
// "BOREAS" en Cormorant + "NFC HUB" en Inter cian debajo.
interface BoreasBrandmarkProps {
  size?: "default" | "small";
  // "dark" (default): "BOREAS" en blanco, para fondos navy — todo el resto
  // de la app. "light": "BOREAS" en navy, para fondos claros (ej. la hoja
  // de impresión de QR, que es blanca).
  variant?: "dark" | "light";
}

export default function BoreasBrandmark({ size = "default", variant = "dark" }: BoreasBrandmarkProps) {
  const isSmall = size === "small";
  const isLight = variant === "light";

  return (
    <div className="leading-none">
      <p
        className={`font-cormorant font-bold ${isLight ? "text-boreas-navy-deep" : "text-white"} ${
          isSmall ? "text-lg" : "text-2xl"
        }`}
      >
        BOREAS
      </p>
      <p
        className={`mt-0.5 font-sans uppercase tracking-[0.25em] text-boreas-cyan ${
          isSmall ? "text-[9px]" : "text-[10px]"
        }`}
      >
        NFC HUB
      </p>
    </div>
  );
}
