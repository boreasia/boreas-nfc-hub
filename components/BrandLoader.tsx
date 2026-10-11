import OwlMark from "./OwlMark";

// Loading UI de marca para los route segments que hacen un fetch real antes
// de poder renderizar (app/admin/activar/[chip_code], app/admin/comercios/
// [client_id]/editar, app/r/[chip_code], y el grupo app/admin/(dashboard)
// mientras carga el chunk de cada página al navegar). Deliberadamente
// liviano: el mark ya está en memoria del navegador (se pidió una vez,
// cacheado), y la animación es animate-pulse de Tailwind — opacidad pura,
// sin JS, sin librería de animación. Nada de spinners genéricos.
export default function BrandLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-16">
      <OwlMark size={40} className="animate-pulse" />
      {label && <p className="text-xs text-boreas-cream/35">{label}</p>}
    </div>
  );
}
