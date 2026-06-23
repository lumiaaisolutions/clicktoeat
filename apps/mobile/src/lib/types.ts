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
  logo_url?: string | null;
  color_primario?: string | null;
}

export interface MyLocalesResponse {
  data: LocalMini[];
  current_local_id: number | null;
}

export interface Ingrediente {
  id: number;
  local_id: number;
  nombre: string;
  stock: number;
  stock_minimo: number;
  unidad: 'pz' | 'kg' | 'g' | 'l' | 'ml';
  costo_unitario: number;
  activo: boolean;
  bajo_stock: boolean;
  recetas_count?: number | null;
}

export interface MovimientoInventario {
  id: number;
  ingrediente_id: number;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'merma';
  cantidad: number;
  stock_resultante: number;
  referencia: string | null;
  motivo: string | null;
  usuario?: { id: number; nombre: string } | null;
  created_at: string;
}

export interface DetalleCompra {
  id: number;
  ingrediente_id: number;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  ingrediente?: { id: number; nombre: string; unidad: string } | null;
}

export interface Compra {
  id: number;
  codigo: string;
  local_id: number;
  proveedor: string | null;
  referencia_factura: string | null;
  fecha: string | null;
  subtotal: number;
  impuestos: number;
  total: number;
  notas: string | null;
  estado: 'registrada' | 'anulada';
  detalles?: DetalleCompra[];
  usuario?: { id: number; nombre: string } | null;
  created_at: string;
}

export interface Cupon {
  id: number;
  local_id: number;
  codigo: string;
  tipo: 'percent' | 'fixed';
  valor: number;
  min_subtotal: number | null;
  max_descuento: number | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  max_usos: number | null;
  activo: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
  dias_semana: string[] | null;
  destacado_en_landing: boolean;
}

export interface Review {
  id: number;
  local_id: number;
  pedido_id: number | null;
  cliente_nombre: string;
  rating: number;
  comentario: string | null;
  aprobado: boolean;
  created_at: string;
}

export interface Staff {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  permisos: string[];
  local_id: number;
  email_verified_at: string | null;
  last_token_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HorarioSlot {
  dia: 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';
  open: string;
  close: string;
}

export interface HorariosResponse {
  horarios: HorarioSlot[];
  cerrado_temporal: boolean;
  zona_horaria: string;
  estado: {
    abierto: boolean | null;
    mensaje: string;
    proxima_apertura: string | null;
    proximo_cierre: string | null;
  };
}

export interface LocalFull {
  id: number;
  nombre: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_fondo: string;
  tipografia: string;
  dark_mode: boolean;
  whatsapp: string | null;
  telefono: string | null;
  email_contacto: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  delivery_activo: boolean;
  delivery_fee: number;
  delivery_min_minutos: number;
  delivery_radio_km: number;
  metodos_pago: Array<'efectivo' | 'tarjeta_entrega' | 'transferencia'>;
  activo: boolean;
  suspendido: boolean;
  public_url: string;
  lealtad_activo: boolean;
  lealtad_meta: number;
  lealtad_premio: string | null;
  plan_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
}

export interface AuditLog {
  id: number;
  action: 'created' | 'updated' | 'deleted' | 'restored';
  resource_type: string;
  resource_id: number;
  changes: Record<string, unknown> | null;
  ip: string | null;
  actor: { id: number; nombre: string; rol: Rol } | null;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  local_id: number;
  user_id: number;
  asunto: string;
  categoria: string;
  prioridad: string;
  estado: 'abierto' | 'respondido' | 'cerrado';
  cerrado_at: string | null;
  local?: { id: number; nombre: string; slug: string };
  user?: { id: number; nombre: string; email: string };
  messages?: TicketMessage[];
  created_at?: string;
  updated_at?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  mensaje: string;
  from_super: boolean;
  created_at: string;
}

export interface SearchResponse {
  data: {
    pedidos: Array<{
      id: number;
      codigo: string;
      cliente_nombre: string;
      total: number;
      estado: PedidoEstado;
      created_at: string;
    }>;
    productos: Array<{
      id: number;
      nombre: string;
      slug: string;
      precio: number;
      disponible: boolean;
    }>;
    clientes: Array<{
      cliente_nombre: string;
      cliente_telefono: string;
      cliente_email: string | null;
      ultimo: string;
      pedidos: number;
    }>;
  };
}

export interface SaasMetrics {
  mrr_mxn: number;
  arr_mxn: number;
  trialing_count: number;
  active_count: number;
  churn_30d_pct: number;
  conversion_30d_pct: number;
  distribucion: Array<{
    plan_slug: string;
    plan_nombre: string;
    status: string;
    count: number;
  }>;
  generated_at: string;
}

export interface AnuncioGlobal {
  id: number;
  titulo: string;
  body: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  active: boolean;
  show_to_super: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface NotificacionesResponse {
  data: Notificacion[];
  no_leidas: number;
  pedidos_activos: Array<{ id: number; codigo: string; estado: PedidoEstado }>;
}
