import { DirectoryClient } from './DirectoryClient';

// Sin cache — refleja cambios del owner inmediatamente.
export const dynamic = 'force-dynamic';

export interface LocalDirectorio {
  id: number;
  slug: string;
  nombre: string;
  tagline: string | null;
  logo: string | null;
  banner: string | null;
  colorPrimario: string;
  colorSecundario: string;
  direccion: string | null;
  whatsapp: string;
  horarios: Array<{ dia: string; open: string; close: string }> | null;
  /** Estado computado server-side — evita hydration mismatch que sufre `new Date()` en cliente. */
  estado?: {
    abierto: boolean | null;
    mensaje: string;
    proxima_apertura: string | null;
    proximo_cierre: string | null;
  };
  deliveryFee: number;
  deliveryMinutos: number;
  productosCount?: number;
  lat?: number | null;
  lng?: number | null;
}

async function getLocales(): Promise<LocalDirectorio[]> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
  try {
    const res = await fetch(`${baseURL}/public/locales`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const locales = await getLocales();
  return <DirectoryClient locales={locales} />;
}
