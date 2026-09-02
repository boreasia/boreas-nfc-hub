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
