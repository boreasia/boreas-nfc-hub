// Marca real de Boreas (lechuza + cinta diagonal), provista por el cliente —
// reemplaza el ícono geométrico placeholder que se había dibujado a mano
// antes de que este archivo existiera. PNG recortado al bounding box real
// del arte (sin los márgenes transparentes) y reescalado a 512×489 desde el
// original de 2048×1960 — ver public/boreas-owl-mark.png. Ya viene en el
// mismo color de marca que boreas.brick (#B5472E, confirmado pixel a pixel:
// no es coincidencia, el brief de la paleta se sacó de este logo), así que
// funciona igual sobre fondo oscuro o claro sin necesitar una variante
// aparte — solo cambia el tamaño.
export default function OwlMark({ size = 28, className }: { size?: number; className?: string }) {
  const height = Math.round((size * 489) / 512);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/boreas-owl-mark.png"
      alt=""
      aria-hidden
      width={size}
      height={height}
      className={className}
      style={{ width: size, height, objectFit: "contain" }}
    />
  );
}
