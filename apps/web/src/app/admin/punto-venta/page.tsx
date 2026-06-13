'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Categoria, Paginated, Pedido, Producto, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { cn, formatMXN } from '@/lib/utils';

type MetodoPago = 'efectivo' | 'tarjeta_tpv' | 'transferencia';

interface CartLine {
  producto: Producto;
  cantidad: number;
}

export default function PuntoVentaPage() {
  const [productos, setProductos]   = useState<Producto[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [activeCat,  setActiveCat]  = useState<number | null>(null);
  const [q,          setQ]          = useState('');
  const [cart,       setCart]       = useState<CartLine[]>([]);
  const [checkout,   setCheckout]   = useState(false);
  const [ultimo,     setUltimo]     = useState<Pedido | null>(null);

  useEffect(() => {
    (async () => {
      const [cats, prods] = await Promise.all([
        api.get<{ data: Categoria[] }>('/categorias', { params: { activo: true } }),
        api.get<Paginated<Producto>>('/productos', { params: { disponible: true, per_page: 100 } }),
      ]);
      setCategorias(cats.data.data);
      setProductos(prods.data.data);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!productos) return [];
    return productos.filter((p) => {
      const matchCat = activeCat === null || p.categoria_id === activeCat;
      const matchQ   = !q || p.nombre.toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [productos, activeCat, q]);

  const addToCart = (p: Producto) => {
    setCart((c) => {
      const existing = c.find((l) => l.producto.id === p.id);
      if (existing) {
        return c.map((l) => l.producto.id === p.id ? { ...l, cantidad: Math.min(99, l.cantidad + 1) } : l);
      }
      return [...c, { producto: p, cantidad: 1 }];
    });
  };

  const setQty = (id: number, qty: number) => {
    setCart((c) => qty <= 0
      ? c.filter((l) => l.producto.id !== id)
      : c.map((l) => l.producto.id === id ? { ...l, cantidad: Math.min(99, qty) } : l),
    );
  };

  const subtotal = cart.reduce((s, l) => s + l.producto.precio * l.cantidad, 0);
  const items    = cart.reduce((s, l) => s + l.cantidad, 0);

  // En móvil: tabs catálogo/carrito; en desktop: split-screen
  const [mobileTab, setMobileTab] = useState<'catalogo' | 'carrito'>('catalogo');

  return (
    <div className="-mx-3 sm:-mx-4 md:-mx-8 -my-4 md:-my-10 min-h-[calc(100vh-3.5rem)] md:h-screen flex flex-col md:flex-row">
      {/* IZQUIERDA: catálogo — siempre visible en desktop, condicional en móvil */}
      <section className={cn(
        'flex-1 min-w-0 flex-col bg-bg',
        mobileTab === 'catalogo' ? 'flex' : 'hidden md:flex',
      )}>
        <header className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-line bg-white flex flex-wrap gap-2 sm:gap-3 items-center">
          <h1 className="ce-display text-lg sm:text-xl md:text-2xl font-bold">Punto de venta</h1>
          <input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 border border-line rounded-xl bg-white text-base sm:text-sm min-h-[44px] sm:min-h-0"
          />
        </header>

        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-b border-line bg-white overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
          <button
            onClick={() => setActiveCat(null)}
            className={cn('px-3 py-2 rounded-full text-sm border tap-target shrink-0',
              activeCat === null ? 'bg-ink text-white border-transparent' : 'border-line bg-white')}
          >
            Todos
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn('px-3 py-2 rounded-full text-sm border whitespace-nowrap tap-target shrink-0',
                activeCat === c.id ? 'bg-ink text-white border-transparent' : 'border-line bg-white')}
            >
              {c.nombre}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 pb-32 md:pb-6">
          {productos === null ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted py-10 text-sm">Sin productos en este filtro.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="text-left rounded-2xl bg-white border border-line overflow-hidden hover:border-ink/40 shadow-soft transition active:scale-95"
                >
                  <div className="aspect-[4/3] bg-line/40">
                    {p.imagen_url && <img src={p.imagen_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-2">
                    <div className="text-xs sm:text-sm font-medium truncate">{p.nombre}</div>
                    <div className="text-sm font-bold mt-0.5">{formatMXN(p.precio)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* DERECHA: carrito — siempre visible desktop, condicional móvil */}
      <aside className={cn(
        'w-full md:w-96 lg:w-[420px] shrink-0 md:border-l border-line bg-white flex-col',
        mobileTab === 'carrito' ? 'flex' : 'hidden md:flex',
      )}>
        <header className="px-4 sm:px-5 py-3 sm:py-4 border-b border-line">
          <p className="text-xs uppercase tracking-wider text-muted">Pedido en curso</p>
          <p className="ce-display text-xl sm:text-2xl font-bold">{items} {items === 1 ? 'producto' : 'productos'}</p>
        </header>

        <ul className="flex-1 overflow-auto divide-y divide-line scroll-fine">
          {cart.length === 0 ? (
            <li className="p-10 text-center text-muted text-sm">
              Agrega productos del catálogo
            </li>
          ) : cart.map((l) => (
            <li key={l.producto.id} className="p-3 flex items-center gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{l.producto.nombre}</div>
                <div className="text-xs text-muted">{formatMXN(l.producto.precio)} c/u</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setQty(l.producto.id, l.cantidad - 1)}
                  className="w-9 h-9 rounded-full border border-line hover:bg-line/40 tap-target"
                >−</button>
                <span className="w-6 text-center text-sm font-medium">{l.cantidad}</span>
                <button
                  onClick={() => setQty(l.producto.id, l.cantidad + 1)}
                  className="w-9 h-9 rounded-full border border-line hover:bg-line/40 tap-target"
                >+</button>
              </div>
              <div className="w-16 text-right text-sm font-bold shrink-0">
                {formatMXN(l.producto.precio * l.cantidad)}
              </div>
            </li>
          ))}
        </ul>

        <footer className="border-t border-line p-3 sm:p-4 bg-white pb-safe">
          <div className="flex justify-between text-sm mb-1"><span>Productos</span><span>{items}</span></div>
          <div className="flex justify-between text-lg font-bold mb-3"><span>Total</span><span>{formatMXN(subtotal)}</span></div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="flex-1"
            >
              Limpiar
            </Button>
            <Button
              onClick={() => setCheckout(true)}
              disabled={cart.length === 0}
              className="flex-1"
            >
              Cobrar
            </Button>
          </div>
        </footer>
      </aside>

      <CheckoutModal
        open={checkout}
        cart={cart}
        subtotal={subtotal}
        onClose={() => setCheckout(false)}
        onSaved={(p) => {
          setCart([]);
          setCheckout(false);
          setUltimo(p);
          toast.success(`Pedido ${p.codigo} cobrado`);
        }}
      />

      <TicketModal open={!!ultimo} pedido={ultimo} onClose={() => setUltimo(null)} />

      {/* Tab switcher móvil — flotante abajo */}
      <div className="md:hidden fixed bottom-3 inset-x-3 z-30 pb-safe">
        <div className="rounded-2xl bg-white shadow-glass border border-line p-1 grid grid-cols-2 gap-1">
          <button
            onClick={() => setMobileTab('catalogo')}
            className={cn(
              'py-2.5 text-sm font-medium rounded-xl transition tap-target',
              mobileTab === 'catalogo' ? 'bg-ink text-white' : 'text-muted',
            )}
          >
            Catálogo
          </button>
          <button
            onClick={() => setMobileTab('carrito')}
            className={cn(
              'py-2.5 text-sm font-medium rounded-xl transition tap-target relative',
              mobileTab === 'carrito' ? 'bg-ink text-white' : 'text-muted',
            )}
          >
            Carrito
            {items > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold grid place-items-center text-white"
                style={{ background: 'var(--ce-accent)' }}
              >
                {items}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cobro ──────────────────────────────────────────────────────
function CheckoutModal({
  open, onClose, onSaved, cart, subtotal,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (p: Pedido) => void;
  cart: CartLine[];
  subtotal: number;
}) {
  const [pago, setPago]       = useState<MetodoPago>('efectivo');
  const [cliente, setCliente] = useState('');
  const [recibido, setRecibido] = useState(0);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (open) {
      setPago('efectivo');
      setCliente('');
      setRecibido(0);
    }
  }, [open]);

  const cambio = Math.max(0, recibido - subtotal);

  const cobrar = async () => {
    setSaving(true);
    try {
      const { data } = await api.post<Resource<Pedido>>('/pedidos', {
        cliente:        cliente ? { nombre: cliente } : undefined,
        metodo_entrega: 'sucursal',
        metodo_pago:    pago,
        items: cart.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
      });
      onSaved(data.data);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const faltantes = err.response.data.faltantes ?? [];
        const lista = faltantes.map((f: any) =>
          `${f.ingrediente} (faltan ${(f.requerido - f.disponible).toFixed(2)}${f.unidad})`
        ).join(', ');
        toast.error(`Sin stock: ${lista}`);
      } else {
        toast.error(err?.response?.data?.message ?? 'No se pudo cobrar');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cobrar" size="md">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted">Total a cobrar</p>
        <p className="ce-display text-4xl font-bold">{formatMXN(subtotal)}</p>
      </div>

      <label className="block text-sm font-medium mb-1">Identifica el pedido (opcional)</label>
      <input
        value={cliente}
        onChange={(e) => setCliente(e.target.value)}
        placeholder="ej. Mesa 4, Cliente con lentes, Para llevar"
        className="w-full mb-4 px-3 py-2 border border-line rounded-xl"
        maxLength={120}
      />

      <p className="text-sm font-medium mb-2">Método de pago</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['efectivo', 'tarjeta_tpv', 'transferencia'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPago(m)}
            className={cn(
              'py-3 rounded-xl border text-sm font-medium',
              pago === m ? 'bg-ink text-white border-transparent' : 'border-line hover:bg-line/30',
            )}
          >
            {m === 'efectivo' ? '💵 Efectivo' : m === 'tarjeta_tpv' ? '💳 Tarjeta' : '📲 Transfer.'}
          </button>
        ))}
      </div>

      {pago === 'efectivo' && (
        <div className="rounded-xl border border-line p-3 mb-4">
          <label className="block text-xs uppercase text-muted mb-1">Recibido</label>
          <input
            type="number"
            value={recibido || ''}
            onChange={(e) => setRecibido(Number(e.target.value))}
            className="w-full text-2xl font-bold py-1 border-b border-line outline-none focus:border-ink"
            placeholder="0"
          />
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-muted">Cambio</span>
            <span className={cn('font-bold', cambio > 0 ? 'text-emerald-600' : '')}>
              {formatMXN(cambio)}
            </span>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {[subtotal, Math.ceil(subtotal/100)*100, Math.ceil(subtotal/50)*50+50, Math.ceil(subtotal/100)*100+100].map((v, i) => (
              <button
                key={i}
                onClick={() => setRecibido(v)}
                className="text-xs px-2 py-1 rounded-lg border border-line hover:bg-line/40"
              >
                {formatMXN(v)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-3 border-t border-line">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={cobrar} loading={saving} disabled={cart.length === 0}>
          Confirmar cobro
        </Button>
      </div>
    </Modal>
  );
}

// ─── Ticket post-cobro ──────────────────────────────────────────
function TicketModal({
  open, pedido, onClose,
}: { open: boolean; pedido: Pedido | null; onClose: () => void }) {
  if (!pedido) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Ticket · ${pedido.codigo}`}>
      <div id="ticket-print" className="font-mono text-xs">
        <p className="text-center font-bold">ClickToEat</p>
        <p className="text-center">{new Date(pedido.created_at).toLocaleString('es-MX')}</p>
        <p className="text-center mb-3">Folio: {pedido.codigo}</p>
        <hr className="border-dashed my-2" />
        {(pedido.detalles ?? []).map((d) => (
          <div key={d.id} className="flex justify-between">
            <span>{d.cantidad}× {d.producto_nombre}</span>
            <span>{formatMXN(d.subtotal)}</span>
          </div>
        ))}
        <hr className="border-dashed my-2" />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatMXN(pedido.total)}</span>
        </div>
        <p className="text-center mt-3">Pago: {labelPago(pedido.metodo_pago)}</p>
        <p className="text-center">{pedido.cliente_nombre}</p>
        <p className="text-center mt-3">¡Gracias por su compra!</p>
      </div>

      <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-line print:hidden">
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button onClick={() => window.print()} className="inline-flex items-center gap-2">
          <Icon name="qr-code" size={16} />
          Imprimir
        </Button>
      </div>
    </Modal>
  );
}

function labelPago(m: Pedido['metodo_pago']): string {
  return {
    efectivo:        'Efectivo',
    tarjeta_entrega: 'Tarjeta a la entrega',
    tarjeta_tpv:     'Tarjeta TPV',
    transferencia:   'Transferencia',
  }[m];
}
