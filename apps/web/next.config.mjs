// SEV-4 — Headers de seguridad para todas las rutas servidas por Next.
// La CSP arranca en Report-Only para no romper landings públicas con estilos
// inline, leaflet, html2canvas, Sentry o Stripe Checkout. Tras 1-2 semanas
// de monitoreo de violaciones (Sentry/Sentry-Reports), convertir a
// `Content-Security-Policy` blocking.
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://clicktoeat-api.lumiaaisolutions.com https://images.unsplash.com https://*.tile.openstreetmap.org https://maps.googleapis.com https://maps.gstatic.com",
      "connect-src 'self' https://clicktoeat-api.lumiaaisolutions.com https://*.sentry.io https://exp.host https://api.stripe.com https://maps.googleapis.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

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

  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
    ];
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
