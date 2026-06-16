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

// Sentry: opt-in. Sólo intenta cargar el wrapper si:
//   1. La var NEXT_PUBLIC_SENTRY_DSN está seteada.
//   2. El paquete @sentry/nextjs está instalado.
// Si falla, devuelve la config sin instrumentar.
let exportedConfig = nextConfig;
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    const { withSentryConfig } = await import('@sentry/nextjs');
    exportedConfig = withSentryConfig(nextConfig, {
      silent: true,
      org:    process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      hideSourceMaps: true,
      disableLogger: true,
    });
  } catch {
    // @sentry/nextjs no está instalado — el SDK está deshabilitado
  }
}

export default exportedConfig;
