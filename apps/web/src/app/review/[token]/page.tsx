'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface LocalInfo { id: number; nombre: string; slug: string }

export default function ReviewPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const router = useRouter();

  const [local,   setLocal]   = useState<LocalInfo | null>(null);
  const [done,    setDone]    = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [rating,  setRating]  = useState(0);
  const [hover,   setHover]   = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<{ local?: LocalInfo; already_submitted: boolean; data?: any }>(`/public/reviews/token/${token}`)
      .then(({ data }) => {
        if (data.already_submitted) { setDone(true); setLocal(data.data?.local ?? null); }
        else { setLocal(data.local ?? null); }
      })
      .catch(() => setError('Link inválido o expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) { setError('Toca una estrella para calificar.'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post(`/public/reviews/token/${token}`, { rating, comentario: comment || null });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo enviar.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Centered>Cargando…</Centered>;
  if (error && !local) return <Centered>{error}</Centered>;
  if (done) return (
    <Centered>
      <Icon name="check-circle" size={48} className="mx-auto text-emerald-600 mb-3" />
      <h1 className="ce-display text-2xl font-bold">¡Gracias!</h1>
      <p className="text-muted mt-2 text-sm">Tu calificación nos ayuda mucho.</p>
      {local && (
        <a href={`/${local.slug}`} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-semibold">
          Volver a {local.nombre}
          <Icon name="arrow-right" size={14} />
        </a>
      )}
    </Centered>
  );

  return (
    <main className="min-h-screen bg-[#FBF8F3] px-4 py-10 grid place-items-center">
      <div className="w-full max-w-md bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-soft">
        <p className="text-xs text-muted uppercase tracking-wider font-semibold">¿Cómo te fue?</p>
        <h1 className="ce-display text-2xl sm:text-3xl font-bold mt-1">{local?.nombre}</h1>
        <p className="text-sm text-muted mt-2">Tu opinión nos ayuda a mejorar y otros clientes la verán antes de pedir.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* Estrellas */}
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="w-12 h-12 grid place-items-center text-3xl transition"
                aria-label={`${n} estrellas`}
              >
                <span className={cn(
                  'transition',
                  (hover || rating) >= n ? 'text-amber-400' : 'text-zinc-200',
                )}>★</span>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm font-semibold text-amber-700">
              {['', 'No muy bien', 'Regular', 'Bien', 'Muy bien', '¡Excelente!'][rating]}
            </p>
          )}

          <div>
            <label className="text-sm font-medium block mb-1">Comentario (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Cuéntales a otros qué te pareció…"
              className="w-full px-3 py-2 rounded-2xl border border-line bg-white text-sm"
            />
            <p className="text-[10px] text-muted text-right mt-1">{comment.length}/1000</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || rating < 1}
            className="w-full px-6 py-3 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? 'Enviando…' : 'Enviar calificación'}
            {!submitting && <Icon name="arrow-right" size={14} />}
          </button>
        </form>
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FBF8F3] px-4 grid place-items-center">
      <div className="text-center max-w-md">
        {children}
      </div>
    </main>
  );
}
