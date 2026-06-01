/** @type {import('next').NextConfig} */
const nextConfig = {
  // Requerido para Electron: genera un servidor Node.js standalone
  // que puede correr sin node_modules completo.
  // Copia todo lo necesario a .next/standalone/
  output: 'standalone',

  // Evita que webpack/turbopack intente procesar estos paquetes
  // en el bundle del cliente (solo corren en el servidor Node)
  serverExternalPackages: ['docxtemplater', 'pizzip'],

  // Turbopack (Next.js 16 default)
  turbopack: {},
};

export default nextConfig;
