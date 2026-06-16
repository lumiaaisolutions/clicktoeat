'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { formatMXN } from '@/lib/utils';

interface SearchResult {
  pedidos:   Array<{ id: number; codigo: string; cliente_nombre: string; total: number; estado: string; created_at: string }>;
  productos: Array<{ id: number; nombre: string; slug: string; precio: number; disponible: boolean }>;
  clientes:  Array<{ cliente_nombre: string; cliente_telefono: string; cliente_email: string | null; pedidos: number; ultimo: string }>;
}

/**
 * Búsqueda global con Cmd+K / Ctrl+K. Trae pedidos por código,
 * productos por nombre y clientes por teléfono/email. Al elegir un
 * resultado navega al detalle correspondiente.
 *
 * Se monta UNA VEZ desde el admin layout. Atajos:
 *   Cmd+K / Ctrl+K → abre
 *   Esc            → cierra
 *   ↑ ↓            → mover entre resultados
 *   Enter          → seleccionar
 */
export function CmdKSearch() {
  const [open,    setOpen]    = useState(false);
  const [q,       setQ]       = useState('');
  const [data,    setData]    = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Búsqueda debounced
  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) { setData(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ data: SearchResult }>('/search', { params: { q } });
        setData(data.data);
      } catch { setData(null); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const close = () => { setOpen(false); setQ(''); setData(null); };
  const go = (href: string) => { close(); router.push(href); };

  if (!open) return null;

  const empty = data && data.pedidos.length === 0 && data.productos.length === 0 && data.clientes.length === 0;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-sm grid place-items-start pt-[10vh] px-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-glass border border-line w-full max-w-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <Icon name="search" size={16} className="text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca pedidos, productos, clientes…"
            className="flex-1 bg-transparent border-0 focus:outline-none text-base"
          />
          <kbd className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-line text-muted">esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <div className="p-8 text-center text-sm text-muted">
              Escribe al menos 2 caracteres. Busca por código de pedido, nombre de producto o teléfono.
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-sm text-muted">Buscando…</div>
          ) : empty ? (
            <div className="p-8 text-center text-sm text-muted">Sin resultados.</div>
          ) : data ? (
            <>
              {data.pedidos.length > 0 && (
                <Section title="Pedidos">
                  {data.pedidos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => go(`/admin/pedidos`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-line/40 text-left"
                    >
                      <Icon name="bell" size={14} className="text-amber-700 shrink-0" />
                      <code className="text-xs font-bold text-ink/80 shrink-0">{p.codigo}</code>
                      <span className="text-sm flex-1 truncate">{p.cliente_nombre}</span>
                      <span className="text-xs text-muted shrink-0">{p.estado}</span>
                      <span className="text-xs font-bold tabular-nums shrink-0">{formatMXN(p.total)}</span>
                    </button>
                  ))}
                </Section>
              )}
              {data.productos.length > 0 && (
                <Section title="Productos">
                  {data.productos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => go(`/admin/productos`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-line/40 text-left"
                    >
                      <Icon name="package" size={14} className="text-emerald-700 shrink-0" />
                      <span className="text-sm flex-1 truncate font-medium">{p.nombre}</span>
                      <span className="text-xs text-muted shrink-0">{p.disponible ? '' : 'oculto'}</span>
                      <span className="text-xs font-bold tabular-nums shrink-0">{formatMXN(p.precio)}</span>
                    </button>
                  ))}
                </Section>
              )}
              {data.clientes.length > 0 && (
                <Section title="Clientes">
                  {data.clientes.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => go(`/admin/pedidos`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-line/40 text-left"
                    >
                      <Icon name="users" size={14} className="text-violet-700 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.cliente_nombre || 'Sin nombre'}</p>
                        <p className="text-[11px] text-muted truncate">
                          {c.cliente_telefono} {c.cliente_email && `· ${c.cliente_email}`}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted tabular-nums shrink-0">{c.pedidos} pedidos</span>
                    </button>
                  ))}
                </Section>
              )}
            </>
          ) : null}
        </div>

        <div className="px-4 py-2 border-t border-line bg-line/20 text-[10px] text-muted flex items-center gap-3">
          <span><kbd className="bg-white border border-line rounded px-1">⌘K</kbd> abrir</span>
          <span><kbd className="bg-white border border-line rounded px-1">esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1.5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted px-4 py-1">{title}</p>
      {children}
    </div>
  );
}
