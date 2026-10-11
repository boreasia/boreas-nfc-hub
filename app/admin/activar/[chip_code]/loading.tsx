import BrandLoader from "@/components/BrandLoader";

// Esta página es un Server Component que hace un fetch real a Supabase
// (ver page.tsx) antes de poder renderizar — este loading.tsx cubre ese
// tiempo de espera en vez de dejar la pantalla en blanco.
export default function ActivarChipLoading() {
  return <BrandLoader label="Buscando chip…" />;
}
