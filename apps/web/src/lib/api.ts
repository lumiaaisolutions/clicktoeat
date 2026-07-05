import axios, { AxiosError, AxiosInstance } from 'axios';

// localhost (no 127.0.0.1) para que la cookie de auth sea same-site en dev
const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

const TOKEN_KEY = 'clickeat:token';

/**
 * SEV-2 — el token vive SOLO en memoria (y en la cookie HttpOnly que setea
 * el backend). Nunca se persiste en localStorage: un XSS ya no puede
 * exfiltrarlo. La cookie viaja sola vía withCredentials.
 */
let memToken: string | null = null;

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 15_000,
});

if (typeof window !== 'undefined') {
  // Limpieza one-time de tokens legacy persistidos antes del cierre de SEV-2
  try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }

  api.interceptors.request.use((config) => {
    if (memToken) {
      config.headers.Authorization = `Bearer ${memToken}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        memToken = null;
      }
      if (error.response?.status === 402) {
        const body = error.response.data as any;
        if (body && (body.code === 'FEATURE_LOCKED' || body.code === 'PLAN_LIMIT' || body.code === 'PLAN_INACTIVE')) {
          window.dispatchEvent(new CustomEvent('clicktoeat:plan-gate', { detail: body }));
        }
      }
      return Promise.reject(error);
    },
  );
}

export const tokenStore = {
  get:   () => memToken,
  set:   (t: string) => { memToken = t; },
  clear: () => { memToken = null; },
};

/**
 * Descarga un endpoint autenticado como archivo (CSV, PDF…) y dispara el save.
 * Útil para los exports — no se puede usar axios responseType: 'blob' por
 * el interceptor que parsea JSON automáticamente.
 */
export async function downloadFile(path: string, params?: Record<string, string>): Promise<void> {
  if (typeof window === 'undefined') return;
  const qs  = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
  const url = `${baseURL}${path}${qs}`;
  const tok = tokenStore.get();
  // La cookie HttpOnly autentica sola; el bearer en memoria es respaldo.
  const res = await fetch(url, {
    credentials: 'include',
    headers: tok ? { Authorization: `Bearer ${tok}` } : {},
  });
  if (!res.ok) throw new Error(`Descarga falló (${res.status})`);
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fname = match?.[1] ?? path.split('/').pop() ?? 'archivo.csv';
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fname;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

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
        activo: boolean;
        fee: number;
        minMinutos: number;
        radioKm: number;
        zona: unknown;
      };
      lealtad: { enabled: boolean; meta: number; premio: string | null } | null;
    };
    hot?: Array<{ producto_id: number; unidades: number }>;
    branding: {
      logo: string | null;
      banner: string | null;
      colorPrimario: string;
      colorSecundario: string;
      colorFondo: string;
      colorOverrides: {
        boton_primario?:   string | null;
        boton_secundario?: string | null;
        badge_oferta?:     string | null;
        precio?:           string | null;
        header_bg?:        string | null;
        header_text?:      string | null;
      } | null;
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
  /** F37 — Rating de reseñas publicadas (null si aún no hay) */
  avgRating?: number | null;
  ratingCount?: number;
}
