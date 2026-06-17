'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

interface Review {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string | null;
  rating: number;
  comentario: string | null;
  aprobado: boolean;
  token: string;
  created_at: string;
}

const FRONTEND = process.env.NEXT_PUBLIC_FRONTEND_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');

export default function ReviewsAdminPage() {
  const [items, setItems] = useState<Review[] | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'aprobados' | 'ocultos'>('todos');

  const refresh = () => {
    setItems(null);
    api.get<{ data: Review[] }>('/admin/reviews')
      .then(({ data }) => setItems(data.data))
      .catch(() => setItems([]));
  };
  useEffect(refresh, []);

  const toggle = async (r: Review) => {
    try {
      await api.patch(`/admin/reviews/${r.id}/toggle`);
      toast.success(r.aprobado ? 'Calificación oculta' : 'Calificación aprobada');
      refresh();
    } catch { toast.error('No se pudo actualizar'); }
  };

  const copyLink = (r: Review) => {
    const link = `${FRONTEND}/review/${r.token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado al portapapeles');
  };

  const borrar = async (r: Review) => {
    if (!confirm(`¿Borrar definitivamente la calificación de ${r.cliente_nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/admin/reviews/${r.id}`);
      toast.success('Calificación eliminada');
      refresh();
    } catch { toast.error('No se pudo borrar'); }
  };

  const filtered = (items ?? []).filter((r) => {
    if (filtro === 'pendientes') return r.rating === 0;
    if (filtro === 'aprobados')  return r.rating > 0 && r.aprobado;
    if (filtro === 'ocultos')    return r.rating > 0 && !r.aprobado;
    return true;
  });

  return (
    <div>
      <AdminPageHeader
        kicker="Calificaciones"
        kickerIcon="star"
        title="Reseñas de"
        titleAccent="tus clientes."
        description="Modera las calificaciones que aparecen en tu landing pública. Las nuevas se aprueban automáticamente — solo oculta las que no te interesa mostrar."
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { v: 'todos',      l: 'Todas' },
          { v: 'pendientes', l: 'Sin calificar (link enviado)' },
          { v: 'aprobados',  l: 'Aprobadas' },
          { v: 'ocultos',    l: 'Ocultas' },
        ].map(({ v, l }) => (
          <button
            key={v}
            type="button"
            onClick={() => setFiltro(v as any)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
              filtro === v ? 'bg-ink text-white border-transparent' : 'bg-white border-line hover:border-ink/30',
            )}
          >{l}</button>
        ))}
      </div>

      {!items ? <Skeleton className="h-40" /> : filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">Nada para este filtro.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold">{r.cliente_nombre}</p>
                    {r.rating > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={cn(n <= r.rating ? 'text-amber-400' : 'text-zinc-200')}>★</span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                        Pendiente
                      </span>
                    )}
                    {r.rating > 0 && !r.aprobado && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                        Oculta
                      </span>
                    )}
                  </div>
                  {r.comentario && <p className="text-sm mt-1.5 italic">"{r.comentario}"</p>}
                  <p className="text-xs text-muted mt-1.5">{new Date(r.created_at).toLocaleString('es-MX')}</p>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  {r.rating === 0 ? (
                    <Button size="sm" variant="secondary" onClick={() => copyLink(r)}>
                      <Icon name="copy" size={12} className="mr-1" />
                      Copiar link
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={r.aprobado ? 'ghost' : 'secondary'}
                      onClick={() => toggle(r)}
                    >
                      {r.aprobado ? 'Ocultar' : 'Aprobar'}
                    </Button>
                  )}
                  {/* F100 — Borrar definitivo (útil para spam u ofensa). Confirmación requerida. */}
                  <button
                    type="button"
                    onClick={() => borrar(r)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                    title="Borrar definitivamente"
                  >
                    <Icon name="x" size={12} />
                    Borrar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
