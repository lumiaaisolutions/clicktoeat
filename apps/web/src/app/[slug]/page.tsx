import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchMenu, MenuNotFoundError } from '@/lib/api';
import { LandingClient } from './LandingClient';

// Reserved routes that should NOT be treated as tenant slugs.
const RESERVED = new Set(['admin', 'api', 'login', 'signup', 'logout', '_next', 'favicon.ico']);

interface PageProps {
  params: { slug: string };
}

// Sin cache — cada visita lee del API. Cambios del owner se ven inmediato.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (RESERVED.has(params.slug)) return {};
  try {
    const { data } = await fetchMenu(params.slug);
    return {
      title: `${data.local.nombre} — Menú`,
      description: data.local.tagline ?? `Pide en ${data.local.nombre} por WhatsApp`,
      themeColor: data.branding.colorPrimario,
      openGraph: {
        title: data.local.nombre,
        description: data.local.tagline ?? '',
        images: data.branding.banner ? [{ url: data.branding.banner }] : [],
      },
    };
  } catch {
    return {};
  }
}

export default async function TenantLandingPage({ params }: PageProps) {
  if (RESERVED.has(params.slug)) notFound();

  let menu;
  try {
    menu = await fetchMenu(params.slug);
  } catch (err) {
    if (err instanceof MenuNotFoundError) notFound();
    throw err;
  }

  return <LandingClient menu={menu.data} />;
}
