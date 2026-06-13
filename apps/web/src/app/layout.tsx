import type { Metadata, Viewport } from 'next';
import './globals.css';

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
