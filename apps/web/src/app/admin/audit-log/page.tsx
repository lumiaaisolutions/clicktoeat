'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { AuditLog, Paginated } from '@/lib/types';
import { toast } from '@/store/toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

const RESOURCE_TYPES = ['Producto', 'Categoria', 'Pedido', 'Ingrediente', 'Compra', 'Local', 'User'];
const ACTIONS = ['created', 'updated', 'deleted', 'restored'] as const;

const ACTION_LABEL: Record<string, string> = {
  created:  'Creó',
  updated:  'Editó',
  deleted:  'Eliminó',
  restored: 'Restauró',
};

const ACTION_COLOR: Record<string, string> = {
  created:  'bg-green-100 text-green-800',
  updated:  'bg-blue-100 text-blue-800',
  deleted:  'bg-red-100 text-red-800',
  restored: 'bg-purple-100 text-purple-800',
};

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLog[] | null>(null);
  const [meta, setMeta] = useState<Paginated<AuditLog>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    resource_type: '',
    action: '',
    desde: '',
    hasta: '',
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [closedDays, setClosedDays] = useState<Set<string>>(new Set());
  const toggleDay = (key: string) => setClosedDays((s) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  const refresh = async () => {
    setItems(null);
    const params: Record<string, string> = { page: String(page), per_page: '50' };
    if (filters.resource_type) params.resource_type = filters.resource_type;
    if (filters.action)        params.action = filters.action;
    if (filters.desde)         params.desde = filters.desde;
    if (filters.hasta)         params.hasta = filters.hasta;

    try {
      const { data } = await api.get<Paginated<AuditLog>>('/audit-logs', { params });
      setItems(data.data);
      setMeta(data.meta);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No pudimos cargar el audit log');
      setItems([]);
    }
  };

  useEffect(() => { refresh(); }, [page, filters]);

  const resetFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Historial"
        kickerIcon="history"
        title="Quién hizo qué,"
        titleAccent="y cuándo."
        description="Historial completo de cambios en tu local. Útil cuando alguien modifica un precio o borra algo."
        tourSlug="audit-log"
      />

      {/* Filtros */}
      <div className="rounded-2xl border border-line bg-white p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select
          value={filters.resource_type}
          onChange={(v) => resetFilter('resource_type', v)}
          className="text-sm"
          aria-label="Filtrar por tipo de recurso"
        >
          <option value="">Todos los recursos</option>
          {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>

        <Select
          value={filters.action}
          onChange={(v) => resetFilter('action', v)}
          className="text-sm"
          aria-label="Filtrar por acción"
        >
          <option value="">Todas las acciones</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
        </Select>

        <input
          type="date"
          value={filters.desde}
          onChange={(e) => resetFilter('desde', e.target.value)}
          className="px-3 py-2 border border-line rounded-xl text-sm"
          placeholder="Desde"
        />

        <input
          type="date"
          value={filters.hasta}
          onChange={(e) => resetFilter('hasta', e.target.value)}
          className="px-3 py-2 border border-line rounded-xl text-sm"
          placeholder="Hasta"
        />
      </div>

      {/* Timeline de cards */}
      {items === null ? (
        <div className="space-y-2">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-12 text-center">
          <Icon name="history" size={32} className="text-muted mx-auto mb-2" />
          <p className="ce-display text-lg font-bold">Sin actividad</p>
          <p className="text-sm text-muted mt-1">No hay cambios registrados con estos filtros.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupByDay(items).map((grupo) => {
            const abierto = !closedDays.has(grupo.key);
            return (
              <section key={grupo.key} className="rounded-3xl border border-line bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleDay(grupo.key)}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-line/20 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-[color:var(--ce-accent,#F26A1F)]/12 text-[color:var(--ce-accent,#F26A1F)] grid place-items-center">
                      <Icon name="clock" size={16} />
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-sm capitalize">{grupo.label}</p>
                      <p className="text-xs text-muted">{grupo.logs.length} {grupo.logs.length === 1 ? 'movimiento' : 'movimientos'}</p>
                    </div>
                  </div>
                  <Icon name="chevron-down" size={16} className={cn('text-muted transition-transform', abierto && 'rotate-180')} />
                </button>

                {abierto && (
                  <ul className="divide-y divide-line border-t border-line">
                    {grupo.logs.map((log) => {
                      const isOpen = expandedId === log.id;
                      const actionIcon: 'plus' | 'check' | 'x' | 'history' =
                        log.action === 'created' ? 'plus'
                        : log.action === 'updated' ? 'check'
                        : log.action === 'deleted' ? 'x'
                        : 'history';
                      const actionTone =
                        log.action === 'created' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : log.action === 'updated' ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : log.action === 'deleted' ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200';
                      const cambiosCount = log.changes ? Object.keys(log.changes).length : 0;
                      return (
                        <li key={log.id}>
                          <button
                            type="button"
                            onClick={() => cambiosCount > 0 && setExpandedId(isOpen ? null : log.id)}
                            className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-line/20 transition"
                          >
                            <div className="flex items-start gap-3">
                              <span className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0 border', actionTone)}>
                                <Icon name={actionIcon} size={16} />
                              </span>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-ink">{humanTitle(log)}</p>
                                <p className="text-xs text-muted mt-0.5">
                                  {log.actor
                                    ? <>Por <strong className="font-semibold text-ink/80">{log.actor.nombre}</strong> · {rolLabel(log.actor.rol)}</>
                                    : 'Realizado automáticamente por el sistema'}
                                  {' · '}
                                  {new Date(log.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>

                              {cambiosCount > 0 && (
                                <Icon name="chevron-down" size={15} className={cn('text-muted shrink-0 mt-1 transition-transform', isOpen && 'rotate-180')} />
                              )}
                            </div>

                            {isOpen && log.changes && Object.keys(log.changes).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-line">
                                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Qué cambió exactamente</p>
                                <ul className="space-y-1.5">
                                  {Object.entries(log.changes).map(([field, [before, after]]) => (
                                    <li key={field} className="text-xs flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-ink/80">{fieldLabel(field)}:</span>
                                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 line-through max-w-[45%] truncate">{formatVal(before)}</span>
                                      <Icon name="arrow-right" size={11} className="text-muted" />
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 max-w-[45%] truncate">{formatVal(after)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Página {meta.current_page} de {meta.last_page} · {meta.total} entradas
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border border-line rounded-xl disabled:opacity-30"
            >
              ← Anterior
            </button>
            <button
              disabled={page === meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-line rounded-xl disabled:opacity-30"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatVal(v: unknown): ReactNode {
  if (v === null || v === undefined || v === '') return 'vacío';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// ─── Humanización: sin tecnicismos, en lenguaje claro ───────────────────────

const RESOURCE_ES: Record<string, { art: string; noun: string }> = {
  Producto: { art: 'el', noun: 'producto' },
  Categoria: { art: 'la', noun: 'categoría' },
  Pedido: { art: 'el', noun: 'pedido' },
  Ingrediente: { art: 'el', noun: 'ingrediente' },
  Compra: { art: 'la', noun: 'compra' },
  Local: { art: 'el', noun: 'local' },
  User: { art: 'el', noun: 'usuario' },
  ToppingGroup: { art: 'el', noun: 'grupo de opciones' },
  Cupon: { art: 'el', noun: 'cupón' },
  Mesa: { art: 'la', noun: 'mesa' },
  Gasto: { art: 'el', noun: 'gasto' },
  Caja: { art: 'la', noun: 'caja' },
  Turno: { art: 'el', noun: 'turno' },
};
function resourceEs(type: string) {
  return RESOURCE_ES[type] ?? { art: 'el', noun: type.toLowerCase() };
}

const FIELD_ES: Record<string, string> = {
  nombre: 'nombre', precio: 'precio', descripcion: 'descripción',
  disponible: 'disponibilidad', activo: 'estado activo', orden: 'orden',
  stock: 'existencias', stock_minimo: 'stock mínimo', costo_unitario: 'costo',
  unidad: 'unidad de medida', imagen_url: 'foto', logo_url: 'logo', banner_url: 'banner',
  color_primario: 'color primario', color_secundario: 'color secundario', color_fondo: 'color de fondo',
  tagline: 'eslogan', whatsapp: 'WhatsApp', telefono: 'teléfono', direccion: 'dirección',
  estado: 'estado', estado_pago: 'estado de pago', metodo_pago: 'método de pago',
  total: 'total', subtotal: 'subtotal', codigo: 'código', email: 'correo',
  permisos: 'permisos', rol: 'rol', slug: 'URL pública', categoria_id: 'categoría',
  icono: 'ícono', delivery_fee: 'costo de envío', tipografia: 'tipografía',
};
function fieldLabel(field: string) {
  return FIELD_ES[field] ?? field.replace(/_id$/, '').replace(/_/g, ' ');
}

const ROL_ES: Record<string, string> = {
  owner: 'Propietario', super_admin: 'Administrador', manager: 'Manager',
  cajero: 'Cajero', cocina: 'Cocina', mesero: 'Mesero',
};
function rolLabel(rol: string) { return ROL_ES[rol] ?? rol; }

function pickNombre(log: AuditLog): string | null {
  const c = log.changes;
  if (!c) return null;
  for (const key of ['nombre', 'codigo', 'etiqueta', 'email']) {
    if (c[key]) {
      const [before, after] = c[key];
      const v = log.action === 'deleted' ? before : (after ?? before);
      if (typeof v === 'string' && v.trim()) return v;
    }
  }
  return null;
}

const VERBO: Record<string, string> = { created: 'Creó', updated: 'Editó', deleted: 'Eliminó', restored: 'Restauró' };

function humanTitle(log: AuditLog): string {
  const r = resourceEs(log.resource_type);
  const nombre = pickNombre(log);
  let base = `${VERBO[log.action] ?? log.action} ${r.art} ${r.noun}${nombre ? ` «${nombre}»` : ''}`;
  if (log.action === 'updated' && log.changes) {
    const campos = Object.keys(log.changes).map(fieldLabel);
    if (campos.length) base += `: cambió ${campos.slice(0, 3).join(', ')}${campos.length > 3 ? ` y ${campos.length - 3} más` : ''}`;
  }
  return base;
}

function groupByDay(items: AuditLog[]): Array<{ key: string; label: string; logs: AuditLog[] }> {
  const map = new Map<string, AuditLog[]>();
  for (const log of items) {
    const d = new Date(log.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  const hoy = new Date();
  const hoyKey = `${hoy.getFullYear()}-${hoy.getMonth()}-${hoy.getDate()}`;
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const ayerKey = `${ayer.getFullYear()}-${ayer.getMonth()}-${ayer.getDate()}`;
  return Array.from(map.entries()).map(([key, logs]) => {
    const d = new Date(logs[0].created_at);
    const label = key === hoyKey ? 'Hoy' : key === ayerKey ? 'Ayer'
      : d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    return { key, label, logs };
  });
}
