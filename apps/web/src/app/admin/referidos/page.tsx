'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

interface Referido {
  id: number;
  local_nombre: string;
  local_slug: string;
  status: 'pending' | 'rewarded' | 'invalid';
  rewarded_at: string | null;
  created_at: string;
}

interface ReferidosResponse {
  codigo: string | null;
  share_url: string | null;
  mensaje_whatsapp: string | null;
  stats: { total: number; pending: number; rewarded: number; ahorro_estimado_mxn: number };
  data: Referido[];
}

export default function ReferidosPage() {
  const [d, setD] = useState<ReferidosResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<ReferidosResponse>('/referidos').then(({ data }) => setD(data));
  }, []);

  if (!d) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  // El share_url del backend depende de env APP_URL_FRONTEND, que puede caer
  // a localhost si no está configurada. Construimos el link en cliente con
  // el origen real del browser — siempre apunta al dominio correcto.
  const origin = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_FRONTEND_URL ?? window.location.origin)
    : 'https://clicktoeat.lumiaaisolutions.com';
  const shareUrl = d.codigo ? `${origin.replace(/\/$/, '')}/?ref=${d.codigo}` : null;
  const mensajeWhatsapp = d.codigo && shareUrl
    ? `Te recomiendo ClickToEat para tu local. Es muy fácil: tu menú online + pedidos por WhatsApp, sin comisiones. Usa mi código *${d.codigo}* al registrarte y los dos ganamos. ${shareUrl}`
    : null;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error('No se pudo copiar'); }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Referidos"
        kickerIcon="sparkles"
        title="Gana 10% de descuento"
        titleAccent="cuando recomiendas."
        description="Comparte tu código con otros dueños. Cuando se suscriban y paguen su primer mes, tú recibes 10% off en tu próxima factura."
      />

      {/* Card del código + share */}
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-amber-50/40 p-6 sm:p-8 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Tu código</p>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <code className="ce-display text-2xl sm:text-4xl font-bold tracking-wide px-4 py-2 rounded-2xl bg-white border-2 border-ink/15 shadow-soft">
            {d.codigo ?? '—'}
          </code>
          {d.codigo && (
            <Button variant="secondary" onClick={() => copy(d.codigo!)}>
              <Icon name={copied ? 'check' : 'copy'} size={14} />
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          )}
        </div>

        {shareUrl && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mt-6">Link para compartir</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <code className="text-xs sm:text-sm flex-1 min-w-0 truncate px-3 py-2 rounded-xl bg-white border border-line">
                {shareUrl}
              </code>
              <Button variant="secondary" size="sm" onClick={() => copy(shareUrl)}>Copiar link</Button>
            </div>
          </>
        )}

        {mensajeWhatsapp && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold hover:opacity-90"
          >
            <Icon name="whatsapp" size={16} />
            Compartir por WhatsApp
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={String(d.stats.total)} />
        <Stat label="Pendientes" value={String(d.stats.pending)} sub="aún no pagan" />
        <Stat label="Recompensados" value={String(d.stats.rewarded)} sub={`Ahorraste $${d.stats.ahorro_estimado_mxn.toFixed(0)} MXN`} highlight />
      </div>

      {/* Lista de referidos */}
      <div className="rounded-3xl border border-line bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <p className="ce-display font-bold text-lg">Tus referidos</p>
        </div>
        {d.data.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="users" size={28} className="text-muted mx-auto" />
            <p className="text-sm text-muted mt-2">Aún no recomiendas a nadie. Comparte tu código.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {d.data.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl grid place-items-center shrink-0',
                  r.status === 'rewarded' ? 'bg-emerald-100 text-emerald-700'
                  : r.status === 'pending' ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600',
                )}>
                  <Icon name={r.status === 'rewarded' ? 'check' : 'clock'} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.local_nombre}</p>
                  <p className="text-xs text-muted">
                    {r.status === 'rewarded' ? `Recompensado el ${r.rewarded_at?.slice(0, 10) ?? ''}`
                      : r.status === 'pending' ? 'En espera de su primer pago'
                      : 'Inválido'}
                  </p>
                </div>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider',
                  r.status === 'rewarded' ? 'bg-emerald-100 text-emerald-700'
                  : r.status === 'pending' ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600',
                )}>
                  {r.status === 'rewarded' ? 'Pagado' : r.status === 'pending' ? 'Pendiente' : 'Inválido'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted text-center">
        Cada referido exitoso te da 10% de descuento (acumulable hasta 100%) en tu próxima factura.
        Aplicamos el descuento automáticamente vía Stripe.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded-3xl border border-line bg-white p-4 sm:p-5',
      highlight && 'border-emerald-300 bg-emerald-50/40',
    )}>
      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</p>
      <p className={cn('ce-display text-2xl md:text-3xl font-bold mt-1 tabular-nums', highlight && 'text-emerald-700')}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
