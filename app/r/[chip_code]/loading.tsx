import BrandLoader from "@/components/BrandLoader";

// El momento más importante de toda la app para tener esto: es lo primero
// que ve el cliente final al tocar/escanear el NFC, mientras el servidor
// busca el chip y registra el tap. Sin esto era pantalla en blanco hasta que
// resolvía el fetch. Lleva su propio fondo (a diferencia de los demás
// loading.tsx) porque esta ruta no comparte layout con bg-boreas-ink — cada
// caso en page.tsx pone el suyo.
export default function ChipRouterLoading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-boreas-ink">
      <BrandLoader />
    </main>
  );
}
