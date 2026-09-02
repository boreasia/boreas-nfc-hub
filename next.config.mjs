/** @type {import('next').NextConfig} */
const nextConfig = {
  // El QR se genera leyendo assets/fonts/Inter-Bold.ttf en runtime. El file
  // tracing de Next no siempre detecta lecturas vía `new URL(..., import.meta.url)`,
  // así que forzamos que la fuente entre en el bundle de la función serverless.
  experimental: {
    // sharp trae binarios nativos precompilados: si webpack intenta bundlearlo
    // el build falla / el binario no resuelve en el runtime Linux de Vercel.
    // Marcarlo como externo hace que se cargue con require() en runtime.
    serverComponentsExternalPackages: ["sharp"],
    outputFileTracingIncludes: {
      "/api/chips/[chip_code]/qr": ["./assets/fonts/**"],
    },
  },
};

export default nextConfig;
