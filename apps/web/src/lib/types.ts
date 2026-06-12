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

export interface Categoria {
  id: number;
  local_id: number;
  nombre: string;
  slug: string;
  icono: string | null;
  orden: number;
  activo: boolean;
  productos_count?: number;
  created_at?: string;
  updated_at?: string;
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
  created_at?: string;
  updated_at?: string;
}

export interface LocalAdmin {
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
  whatsapp: string;
  telefono: string | null;
  email_contacto: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  horarios: Array<{ dia: string; open: string; close: string }> | null;
  zona_entrega: unknown;
  delivery_fee: number;
  delivery_min_minutos: number;
  delivery_radio_km: number;
  redes_sociales: { ig?: string; fb?: string; tt?: string; wapp?: string } | null;
  metodos_pago: Array<'efectivo' | 'tarjeta_entrega' | 'transferencia'> | null;
  activo: boolean;
  suspendido: boolean;
  modulos: unknown;
  public_url: string;
}

export interface UploadResult {
  url: string;
  public_id: string;
  width: number | null;
  height: number | null;
  bytes: number;
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
  recetas_count?: number;
}

export interface Receta {
  id: number;
  producto_id: number;
  ingrediente_id: number | null;
  componente_producto_id: number | null;
  cantidad: number;
  tipo: 'ingrediente' | 'componente';
  ingrediente?: { id: number; nombre: string; unidad: string; stock: number } | null;
  componente?: { id: number; nombre: string; slug: string } | null;
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

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  data: Record<string, any> | null;
  leida: boolean;
  leida_at: string | null;
  created_at: string;
}

export interface EstadoHorario {
  abierto: boolean | null;
  mensaje: string;
  proxima_apertura: string | null;
  proximo_cierre: string | null;
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
  estado: EstadoHorario;
}

export interface MetricasResponse {
  rango: { desde: string; hasta: string; dias: number };
  resumen: {
    pedidos: number;
    ventas_total: number;
    ventas_subtotal: number;
    ingresos_envio: number;
    ticket_promedio: number;
    costo_compras: number;
    margen_aprox: number;
    margen_pct: number;
    bajo_stock: number;
  };
  por_estado:  Record<string, number>;
  por_entrega: Record<string, { pedidos: number; monto: number }>;
  por_pago:    Record<string, { pedidos: number; monto: number }>;
  serie_diaria: Array<{ fecha: string; pedidos: number; ventas: number }>;
  top_productos: Array<{ producto_nombre: string; cantidad: number; ingresos: number; pedidos: number }>;
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
  fecha: string;
  subtotal: number;
  impuestos: number;
  total: number;
  notas: string | null;
  estado: 'registrada' | 'anulada';
  detalles?: DetalleCompra[];
  usuario?: { id: number; nombre: string } | null;
  created_at: string;
}


export interface Staff {
  id: number;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'owner' | 'staff';
  local_id: number | null;
  email_verified_at: string | null;
  last_token_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  action: 'created' | 'updated' | 'deleted' | 'restored';
  resource_type: string;
  resource_id: number;
  changes: Record<string, [unknown, unknown]> | null;
  ip: string | null;
  actor: { id: number; nombre: string; rol: string } | null;
  created_at: string;
}

