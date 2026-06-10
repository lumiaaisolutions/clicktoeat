import axios, { AxiosError, AxiosInstance } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8080/api/v1';

const TOKEN_KEY = 'clickeat:token';

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 15_000,
});

if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        window.localStorage.removeItem(TOKEN_KEY);
      }
      return Promise.reject(error);
    },
  );
}

export const tokenStore = {
  get:   () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  set:   (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

/**
 * Server-side fetcher (Next.js RSC).
 *
 * Usamos `cache: 'no-store'` para que cada visita sirva datos frescos. Sin
 * esto, Next.js cachea hasta 60s y los cambios del owner (nuevo producto,
 * cambio de stock o branding) tardan en aparecer en la landing.
 *
 * Para producción de alto tráfico se puede volver a ISR (revalidate: N)
 * y disparar `revalidateTag('menu:slug')` desde un webhook que el backend
 * llame al mutar el catálogo. Por ahora no-store es más simple y predecible.
 */
export async function fetchMenu(slug: string): Promise<MenuResponse> {
  const url = `${baseURL}/public/menu/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    cache: 'no-store',
    next: { tags: [`menu:${slug}`] },
  });

  if (res.status === 404) {
    throw new MenuNotFoundError(slug);
  }
  if (!res.ok) {
    throw new Error(`Menu fetch failed: ${res.status}`);
  }

  return res.json();
}

export class MenuNotFoundError extends Error {
  constructor(public slug: string) {
    super(`Local "${slug}" no encontrado.`);
    this.name = 'MenuNotFoundError';
  }
}

// ── Tipos espejados del MenuController ──────────────────────────────
export interface MenuResponse {
  data: {
    local: {
      id: number;
      nombre: string;
      slug: string;
      tagline: string | null;
      whatsapp: string;
      telefono: string | null;
      direccion: string | null;
      lat: number | null;
      lng: number | null;
      horarios: Array<{ dia: string; open: string; close: string }> | null;
      redes: Record<string, string> | null;
      metodosPago: Array<'efectivo' | 'tarjeta_entrega' | 'transferencia'>;
      delivery: {
        fee: number;
        minMinutos: number;
        radioKm: number;
        zona: unknown;
      };
    };
    branding: {
      logo: string | null;
      banner: string | null;
      colorPrimario: string;
      colorSecundario: string;
      colorFondo: string;
      tipografia: string;
      darkMode: boolean;
    };
    categorias: Array<{
      id: number;
      slug: string;
      nombre: string;
      icono: string | null;
      orden: number;
    }>;
    productos: Array<MenuProducto>;
  };
}

export interface MenuProducto {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  precioDescuento: number | null;
  imagen: string | null;
  disponible: boolean;
  esCombo: boolean;
  esPromocion: boolean;
  tag: string | null;
  extras: Array<{
    group: string;
    kind: 'one' | 'many';
    required?: boolean;
    items: Array<{ id: string; name: string; price: number }>;
  }>;
  categoria: { id: number | null; slug: string | null };
}
