/**
 * Tipos espejados de apps/web/src/lib/types.ts.
 * Mantener en sincronía con el backend (Resources en apps/api).
 */

export interface Paginated<T> {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    path: string;
  };
}

export interface Resource<T> {
  data: T;
}

export type Rol = 'super_admin' | 'owner' | 'staff';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  permisos?: string[];
  local_id: number | null;
}

export interface PlanInfo {
  plan_id: number | null;
  plan_slug: string | null;
  plan_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  features: Record<string, boolean | number>;
}

export interface MeResponse {
  user: AuthUser;
  plan?: PlanInfo | null;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  two_factor_required?: boolean;
}

export interface Categoria {
  id: number;
  local_id: number;
  nombre: string;
  slug: string;
  icono: string | null;
  orden: number;
  activo: boolean;
  productos_count?: number;
}

export interface ExtraGroup {
  group: string;
  kind: 'one' | 'many';
  required?: boolean;
  items: { id: string; name: string; price: number }[];
}

export interface Producto {
  id: number;
  local_id: number;
  categoria_id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  precio: number;
  precio_descuento: number | null;
  imagen_url: string | null;
  imagen_public_id: string | null;
  disponible: boolean;
  es_combo: boolean;
  es_promocion: boolean;
  tag: string | null;
  orden: number;
  extras: ExtraGroup[];
  categoria?: { id: number; slug: string; nombre: string };
}

export type PedidoEstado =
  | 'nuevo' | 'confirmado' | 'preparando' | 'listo'
  | 'en_camino' | 'entregado' | 'cancelado';

export interface DetallePedido {
  id: number;
  producto_id: number | null;
  producto_nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  extras_seleccionados: Array<{ group: string; item: string; price: number }>;
  notas: string | null;
}

export interface Pedido {
  id: number;
  codigo: string;
  local_id: number;
  cliente_nombre: string;
  cliente_email?: string | null;
  cliente_telefono: string;
  direccion: string | null;
  notas: string | null;
  metodo_entrega: 'pickup' | 'delivery' | 'sucursal';
  metodo_pago: 'efectivo' | 'tarjeta_entrega' | 'tarjeta_tpv' | 'transferencia';
  subtotal: number;
  delivery_fee: number;
  descuento: number;
  total: number;
  estado: PedidoEstado;
  whatsapp_url: string | null;
  detalles?: DetallePedido[];
  confirmado_at: string | null;
  entregado_at: string | null;
  created_at: string;
  updated_at: string;
  review_token?: string | null;
}

export interface MetricasResumen {
  pedidos: number;
  ventas_total: number;
  ventas_subtotal: number;
  ingresos_envio: number;
  ticket_promedio: number;
  costo_compras: number;
  margen_aprox: number;
  margen_pct: number;
  bajo_stock: number;
}

export interface MetricasResponse {
  rango: { desde: string; hasta: string; dias: number };
  resumen: MetricasResumen;
  por_estado: Record<string, number>;
  por_entrega: Record<string, { pedidos: number; monto: number }>;
  por_pago: Record<string, { pedidos: number; monto: number }>;
  serie_diaria: Array<{ fecha: string; pedidos: number; ventas: number }>;
  top_productos: Array<{ producto_nombre: string; cantidad: number; ingresos: number; pedidos: number }>;
}

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  data: Record<string, unknown> | null;
  leida: boolean;
  leida_at: string | null;
  created_at: string;
}

export interface LocalMini {
  id: number;
  nombre: string;
  slug: string;
}
