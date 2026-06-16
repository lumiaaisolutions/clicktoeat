'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8080/api/v1';

interface Producto {
  id: number;
  nombre: string;
  imagen: string | null;
}

interface Props {
  slug:   string;
  codigo: string;
  productos: Producto[];
  local:  { nombre: string; slug: string } | null;
}

export function ResenarClient({ slug, codigo, productos, local }: Props) {
  // {productoId: {calificacion, comentario, sent, error}}
  const [estado, setEstado] = useState<Record<number, { c: number; com: string; image: File | null; sent: boolean; err?: string; loading: boolean }>>({});
  const [nombre, setNombre] = useState('');

  const setProd = (id: number, patch: Partial<{ c: number; com: string; image: File | null; sent: boolean; err?: string; loading: boolean }>) => {
    setEstado((s) => {
      const prev = s[id] ?? { c: 0, com: '', image: null, sent: false, loading: false };
      return { ...s, [id]: { ...prev, ...patch } };
    });
  };

  const send = async (p: Producto) => {
    const st = estado[p.id];
    if (!st || st.c < 1) {
      setProd(p.id, { err: 'Elige una calificación.' });
      return;
    }
    setProd(p.id, { loading: true, err: undefined });
    try {
      const fd = new FormData();
      fd.append('producto_id',    String(p.id));
      fd.append('calificacion',   String(st.c));
      if (st.com)    fd.append('comentario',     st.com);
      if (nombre)    fd.append('nombre_cliente', nombre);
      if (st.image)  fd.append('image',          st.image);

      await axios.post(`${apiBase}/public/resenas/${codigo}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProd(p.id, { sent: true, loading: false });
    } catch (e: any) {
      setProd(p.id, {
        loading: false,
        err: e?.response?.data?.message ?? 'No pudimos guardar la reseña.',
      });
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--ce-bg)] pb-16">
      <header className="bg-white border-b border-line">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <Link href={`/${slug}`} className="text-muted hover:text-ink" aria-label="Volver">
            <Icon name="arrow-right" size={18} className="rotate-180" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold">Tu pedido {codigo}</p>
            <h1 className="ce-display text-xl font-bold truncate">{local?.nombre ?? 'Local'}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">¡Gracias por tu pedido!</p>
          <h2 className="ce-display text-2xl sm:text-3xl font-bold mt-1.5">¿Cómo te pareció?</h2>
          <p className="text-sm text-muted mt-2">
            Tu opinión ayuda a otros clientes a elegir bien. Tarda menos de 1 minuto.
          </p>

          <label className="block mt-5">
            <span className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Tu nombre (opcional)</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Como quieres que aparezca tu reseña"
              maxLength={120}
              className="w-full h-11 px-3 rounded-xl border border-line bg-white text-sm focus:outline-none focus:border-ink/40"
            />
          </label>
        </div>

        {productos.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white p-10 text-center text-muted text-sm">
            No pudimos cargar los productos. Revisa el link.
          </div>
        ) : (
          productos.map((p) => {
            const st = estado[p.id] ?? { c: 0, com: '', sent: false, loading: false };
            return (
              <div key={p.id} className="rounded-3xl border border-line bg-white p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-line/40 overflow-hidden shrink-0">
                    {p.imagen && <img src={p.imagen} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <h3 className="ce-display font-bold text-base flex-1 min-w-0 truncate">{p.nombre}</h3>
                </div>

                {st.sent ? (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 inline-flex items-center gap-2">
                    <Icon name="check" size={14} />
                    ¡Gracias! Tu reseña fue guardada.
                  </div>
                ) : (
                  <>
                    {/* Stars */}
                    <div className="flex items-center gap-1.5 mb-3" role="radiogroup" aria-label="Calificación">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setProd(p.id, { c: n })}
                          aria-label={`${n} de 5`}
                          className="p-1 -m-1"
                        >
                          <Icon
                            name={n <= st.c ? 'star-filled' : 'star'}
                            size={28}
                            className={cn(n <= st.c ? 'text-amber-500' : 'text-line')}
                          />
                        </button>
                      ))}
                    </div>

                    <textarea
                      placeholder="Cuéntanos qué te pareció (opcional)"
                      value={st.com}
                      onChange={(e) => setProd(p.id, { com: e.target.value })}
                      maxLength={500}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-line bg-white text-sm resize-none focus:outline-none focus:border-ink/40"
                    />

                    {/* Foto del platillo recibido */}
                    <div className="mt-3">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 inline-flex items-center gap-1.5">
                        <Icon name="camera" size={12} />
                        Foto (opcional)
                      </label>
                      {st.image ? (
                        <div className="relative inline-block">
                          <img
                            src={URL.createObjectURL(st.image)}
                            alt=""
                            className="w-32 h-32 object-cover rounded-xl border border-line"
                          />
                          <button
                            type="button"
                            onClick={() => setProd(p.id, { image: null })}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-ink text-white grid place-items-center shadow-md"
                            aria-label="Quitar foto"
                          >
                            <Icon name="x" size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-line cursor-pointer hover:border-ink/40 text-sm text-muted hover:text-ink">
                          <Icon name="download" size={14} className="rotate-180" />
                          Subir foto
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setProd(p.id, { image: e.target.files?.[0] ?? null })}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {st.err && <p className="text-xs text-red-600 mt-2">{st.err}</p>}

                    <button
                      type="button"
                      onClick={() => send(p)}
                      disabled={st.loading || st.c < 1}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                    >
                      {st.loading ? 'Enviando…' : 'Enviar reseña'}
                      <Icon name="arrow-right" size={14} />
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}

        <p className="text-center text-xs text-muted">
          Tus reseñas son públicas y ayudan a otros clientes.
        </p>
      </div>
    </main>
  );
}
