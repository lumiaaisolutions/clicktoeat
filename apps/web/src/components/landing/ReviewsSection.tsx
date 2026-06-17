'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Review {
  id: number;
  cliente_nombre: string;
  rating: number;
  comentario: string | null;
  created_at: string;
}

interface Response { data: Review[]; average: number | null; total: number }

export function ReviewsSection({ slug }: { slug: string }) {
  const [data, setData] = useState<Response | null>(null);

  useEffect(() => {
    api.get<Response>(`/public/reviews/local/${slug}`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ data: [], average: null, total: 0 }));
  }, [slug]);

  if (!data || data.total === 0) return null;

  return (
    <section className="px-4 sm:px-6 py-12 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
          <span className="text-2xl">★</span>
          <span className="ce-display text-xl font-bold text-amber-900">{data.average}</span>
          <span className="text-xs text-amber-700">/ 5 · {data.total} {data.total === 1 ? 'opinión' : 'opiniones'}</span>
        </div>
        <h2 className="ce-display text-2xl sm:text-3xl font-bold mt-3">Lo que dicen los clientes</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.data.slice(0, 6).map((r) => (
          <article key={r.id} className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={cn(n <= r.rating ? 'text-amber-400' : 'text-zinc-200')}>★</span>
              ))}
            </div>
            {r.comentario && <p className="text-sm leading-relaxed mb-3">"{r.comentario}"</p>}
            <p className="text-xs text-muted font-semibold">— {r.cliente_nombre}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
