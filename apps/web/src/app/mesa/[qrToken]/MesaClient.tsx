'use client';

import { useState } from 'react';
import { MenuProducto } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/FormField';

interface MesaInfo {
  mesaId: number;
  etiqueta: string;
  localSlug: string;
  localNombre: string;
}

interface CartExtra {
  group: string;
  item: string;
  price: number;
  itemLabel: string;
}

interface CartLine {
  lineKey: string;
  productoId: number;
  nombre: string;
  precioBase: number;
  extras: CartExtra[];
  cantidad: number;
}

function lineKeyFor(productoId: number, extras: CartExtra[]): string {
  const sorted = [...extras].sort((a, b) => (a.group + a.item).localeCompare(b.group + b.item));
  return `${productoId}:${sorted.map((e) => `${e.group}=${e.item}`).join(',')}`;
}

/**
 * Ordenar desde la mesa (QR), sin login. Carrito es estado local de la
 * página (no el store global de carrito de la landing normal) para no
 * mezclar sesiones de pickup/delivery con pedidos de mesa en el mismo
 * dispositivo.
 */
export function MesaClient({
  mesa, qrToken, menu,
}: {
  mesa: MesaInfo;
  qrToken: string;
  menu: {
    categorias: Array<{ id: number; nombre: string }>;
    productos: MenuProducto[];
  };
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [llamando, setLlamando] = useState(false);
  const [llamadoOk, setLlamadoOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [extrasProducto, setExtrasProducto] = useState<MenuProducto | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

  const addLine = (p: MenuProducto, extras: CartExtra[]) => {
    const lineKey = lineKeyFor(p.id, extras);
    setCart((prev) => {
      const existing = prev.find((l) => l.lineKey === lineKey);
      if (existing) {
        return prev.map((l) => (l.lineKey === lineKey ? { ...l, cantidad: l.cantidad + 1 } : l));
      }
      return [...prev, {
        lineKey, productoId: p.id, nombre: p.nombre,
        precioBase: p.precioDescuento ?? p.precio, extras, cantidad: 1,
      }];
    });
  };

  const handleAgregar = (p: MenuProducto) => {
    if (p.extras && p.extras.length > 0) {
      setExtrasProducto(p);
    } else {
      addLine(p, []);
    }
  };

  const cantidadEnCarrito = (productoId: number) =>
    cart.filter((l) => l.productoId === productoId).reduce((n, l) => n + l.cantidad, 0);

  const setQty = (lineKey: string, cantidad: number) => {
    setCart((prev) => {
      if (cantidad <= 0) return prev.filter((l) => l.lineKey !== lineKey);
      return prev.map((l) => (l.lineKey === lineKey ? { ...l, cantidad } : l));
    });
  };

  const lineTotal = (l: CartLine) => (l.precioBase + l.extras.reduce((s, e) => s + e.price, 0)) * l.cantidad;
  const total = cart.reduce((sum, l) => sum + lineTotal(l), 0);

  const enviarPedido = async () => {
    if (cart.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/public/mesa/${encodeURIComponent(qrToken)}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: clienteNombre ? { nombre: clienteNombre } : undefined,
          items: cart.map((l) => ({
            producto_id: l.productoId,
            cantidad: l.cantidad,
            extras: l.extras.map((e) => ({ group: e.group, item: e.item, price: e.price })),
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'No se pudo enviar el pedido.');
      }
      setEnviado(true);
      setCart([]);
    } catch (err: any) {
      setError(err.message ?? 'No se pudo enviar el pedido.');
    } finally {
      setEnviando(false);
    }
  };

  const llamarMesero = async () => {
    setLlamando(true);
    try {
      const res = await fetch(`${apiBase}/public/mesa/${encodeURIComponent(qrToken)}/llamar-mesero`, { method: 'POST' });
      if (!res.ok) throw new Error();
      setLlamadoOk(true);
      setTimeout(() => setLlamadoOk(false), 4000);
    } catch {
      setError('No se pudo llamar al mesero, intenta de nuevo.');
    } finally {
      setLlamando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-32">
      <header className="bg-white border-b border-line px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">{mesa.localNombre}</p>
          <h1 className="ce-display text-xl font-bold">{mesa.etiqueta}</h1>
        </div>
        <Button variant="secondary" size="sm" loading={llamando} onClick={llamarMesero}>
          <Icon name="bell" size={16} /> Llamar mesero
        </Button>
      </header>

      {llamadoOk && (
        <div className="mx-4 mt-3 rounded-xl bg-emerald-100 text-emerald-700 text-sm px-3 py-2 text-center">
          Avisamos al mesero — ya viene.
        </div>
      )}
      {error && (
        <div className="mx-4 mt-3 rounded-xl bg-red-100 text-red-700 text-sm px-3 py-2 text-center">{error}</div>
      )}

      {enviado ? (
        <div className="p-8 text-center">
          <Icon name="check-circle" size={40} className="text-emerald-600 mx-auto" />
          <p className="ce-display text-2xl font-bold mt-4">¡Pedido enviado!</p>
          <p className="text-sm text-muted mt-1">La cocina ya lo tiene. Puedes pedir algo más cuando quieras.</p>
          <Button className="mt-6" onClick={() => setEnviado(false)}>Pedir algo más</Button>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          <div className="rounded-xl border border-line bg-white p-3">
            <Field
              label="Tu nombre (opcional)"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              placeholder="Para que el mesero sepa a quién llamar"
            />
          </div>

          {menu.categorias.map((cat) => {
            const productos = menu.productos.filter((p) => (p as any).categoria?.id === cat.id);
            if (productos.length === 0) return null;
            return (
              <section key={cat.id}>
                <h2 className="ce-display font-bold text-lg mb-2">{cat.nombre}</h2>
                <div className="space-y-2">
                  {productos.map((p) => {
                    const cantidad = cantidadEnCarrito(p.id);
                    const tieneExtras = p.extras && p.extras.length > 0;
                    return (
                      <div key={p.id} className="rounded-xl border border-line bg-white p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{p.nombre}</p>
                          <p className="text-sm text-muted">${(p.precioDescuento ?? p.precio).toFixed(2)}</p>
                          {cantidad > 0 && <p className="text-xs text-emerald-700 mt-0.5">En tu pedido: {cantidad}</p>}
                        </div>
                        {!tieneExtras && cart.find((l) => l.lineKey === lineKeyFor(p.id, [])) ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="secondary" onClick={() => setQty(lineKeyFor(p.id, []), cantidad - 1)}>-</Button>
                            <span className="w-6 text-center font-semibold">{cantidad}</span>
                            <Button size="sm" variant="secondary" onClick={() => setQty(lineKeyFor(p.id, []), cantidad + 1)}>+</Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => handleAgregar(p)}>Agregar</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {cart.length > 0 && !enviado && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-line p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted">{cart.reduce((n, l) => n + l.cantidad, 0)} productos</p>
            <p className="ce-display font-bold text-lg">${total.toFixed(2)}</p>
          </div>
          <Button loading={enviando} onClick={enviarPedido}>Enviar pedido</Button>
        </div>
      )}

      {extrasProducto && (
        <ExtrasModal
          producto={extrasProducto}
          onClose={() => setExtrasProducto(null)}
          onConfirm={(extras) => { addLine(extrasProducto, extras); setExtrasProducto(null); }}
        />
      )}
    </div>
  );
}

function ExtrasModal({
  producto, onClose, onConfirm,
}: {
  producto: MenuProducto;
  onClose: () => void;
  onConfirm: (extras: CartExtra[]) => void;
}) {
  const [selected, setSelected] = useState<Record<string, CartExtra[]>>({});

  const toggleOne = (group: string, item: { id: string; name: string; price: number }) => {
    setSelected((prev) => ({ ...prev, [group]: [{ group, item: item.id, price: item.price, itemLabel: item.name }] }));
  };

  const toggleMany = (group: string, item: { id: string; name: string; price: number }) => {
    setSelected((prev) => {
      const current = prev[group] ?? [];
      const exists = current.some((e) => e.item === item.id);
      const next = exists ? current.filter((e) => e.item !== item.id) : [...current, { group, item: item.id, price: item.price, itemLabel: item.name }];
      return { ...prev, [group]: next };
    });
  };

  const faltanRequeridos = producto.extras.some((g) => g.required && !(selected[g.group]?.length));

  const confirmar = () => {
    const extras = Object.values(selected).flat();
    onConfirm(extras);
  };

  return (
    <Modal open onClose={onClose} title={producto.nombre} size="sm">
      <div className="space-y-4">
        {producto.extras.map((grupo) => (
          <div key={grupo.group}>
            <p className="text-sm font-semibold mb-1">
              {grupo.group} {grupo.required && <span className="text-red-500">*</span>}
            </p>
            <div className="space-y-1">
              {grupo.items.map((item) => {
                const isSelected = (selected[grupo.group] ?? []).some((e) => e.item === item.id);
                return (
                  <label key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-line cursor-pointer">
                    <span className="flex items-center gap-2 text-sm">
                      <input
                        type={grupo.kind === 'one' ? 'radio' : 'checkbox'}
                        name={grupo.group}
                        checked={isSelected}
                        onChange={() => (grupo.kind === 'one' ? toggleOne(grupo.group, item) : toggleMany(grupo.group, item))}
                      />
                      {item.name}
                    </span>
                    {item.price > 0 && <span className="text-xs text-muted">+${item.price.toFixed(2)}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-line">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} disabled={faltanRequeridos}>Agregar</Button>
      </div>
    </Modal>
  );
}
