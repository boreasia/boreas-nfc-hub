// Redeploy trigger (2026-09-14): producción quedó fijada a un deployment
// viejo tras el rollback manual del incidente de dominio/auth de la semana
// pasada, así que servía la versión de /api/chips/[chip_code]/qr sin número.
// Este commit fuerza un deploy nuevo desde main para que Vercel vuelva a
// seguir HEAD (c20b9ea y en adelante) en vez del deployment rolled-back.
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // sharp trae binarios nativos precompilados: si webpack intenta bundlearlo
    // el build falla / el binario no resuelve en el runtime Linux de Vercel.
    // Marcarlo como externo hace que se cargue con require() en runtime.
    serverComponentsExternalPackages: ["sharp"],
  },
};

export default nextConfig;
