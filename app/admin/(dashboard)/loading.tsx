import BrandLoader from "@/components/BrandLoader";

// Next.js muestra esto automáticamente mientras carga el chunk de código de
// cada página del dashboard al navegar entre Resumen/Clientes/Chips/Reseñas/
// Configuración — sin esto, esa navegación entre route segments separados
// (cada uno su propio bundle) se sentía como un salto en blanco.
export default function DashboardLoading() {
  return <BrandLoader />;
}
