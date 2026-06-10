/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Salida standalone: requerida por el deploy a Hostinger (Passenger) y por
  // el Dockerfile productivo. Genera .next/standalone con todo lo necesario
  // para correr el servidor sin node_modules adicional.
  // Ver: scripts/deploy-web.sh + apps/web/Dockerfile
  output: 'standalone',

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'clicktoeat-api.lumiaaisolutions.com' },
    ],
  },
};

export default nextConfig;
