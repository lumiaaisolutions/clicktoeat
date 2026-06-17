import type { Metadata, Viewport } from 'next';
import './globals.css';
import { InitialLoader } from '@/components/ui/InitialLoader';
import { RouteTransition } from '@/components/ui/RouteTransition';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { RefCapture } from '@/components/referral/RefCapture';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ClickToEat — Pide por WhatsApp',
    template:  '%s · ClickToEat',
  },
  description:
    'Plataforma para que cada local de comida tenga su propia landing y reciba pedidos directo por WhatsApp. Sin app del cliente, sin comisiones.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml', sizes: '180x180' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'ClickToEat',
    title: 'ClickToEat — Pide por WhatsApp',
    description: 'Tu antojo, a un mensaje de distancia.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClickToEat — Pide por WhatsApp',
    description: 'Tu antojo, a un mensaje de distancia.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="application-name" content="ClickToEat" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ClickToEat" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Serif+Display:wght@400&family=Lora:wght@500;600;700&family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&family=Pacifico&family=Abril+Fatface&family=Anton&family=Space+Mono:wght@400;700&family=Lobster&family=Bebas+Neue&family=Caveat:wght@400;500;600;700&family=Roboto+Slab:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <InitialLoader />
        <RouteTransition />
        <PwaRegister />
        <RefCapture />
        {children}
      </body>
    </html>
  );
}
