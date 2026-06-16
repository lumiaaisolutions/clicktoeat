'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

interface Msg {
  id: number;
  mensaje: string;
  from_super: boolean;
  created_at: string;
}

interface Ticket {
  id: number;
  asunto: string;
  categoria: string;
  prioridad: string;
  estado: 'abierto' | 'respondido' | 'cerrado';
  created_at: string;
  local: { id: number; nombre: string; slug: string } | null;
  user:  { id: number; nombre: string; email: string } | null;
  messages: Msg[];
}

export default function TicketsPage() {
  const [items, setItems] = useState<Ticket[] | null>(null);
  const [estado, setEstado] = useState<string>('');
  const [open,   setOpen]   = useState<Ticket | null>(null);

  const refresh = () => {
    setItems(null);
    api.get<{ data: Ticket[] }>('/admin/tickets', { params: { estado: estado || undefined } })
      .then(({ data }) => setItems(data.data ?? (data as any)));
  };
  useEffect(refresh, [estado]);

  return (
    <div>
      <AdminPageHeader
        kicker="Soporte"
        kickerIcon="help"
        title="Tickets de"
        titleAccent="los locales."
        description="Cada local puede abrir un ticket desde su panel. Respondes acá y se le notifica por correo."
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { v: '',          l: 'Todos' },
          { v: 'abierto',   l: 'Abiertos' },
          { v: 'respondido', l: 'Respondidos' },
          { v: 'cerrado',   l: 'Cerrados' },
        ].map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setEstado(v)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border', estado === v ? 'bg-ink text-white border-transparent' : 'bg-white border-line')}
          >{l}</button>
        ))}
      </div>

      {!items ? <Skeleton className="h-40" /> : items.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">Sin tickets.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpen(t)}
                className="w-full rounded-2xl border border-line bg-white p-4 text-left hover:border-ink/30 transition"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <span className={cn(
                    'text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full',
                    t.estado === 'abierto' ? 'bg-amber-100 text-amber-800'
                    : t.estado === 'respondido' ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-800',
                  )}>{t.estado}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{t.asunto}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {t.local?.nombre ?? '—'} · {t.user?.email ?? '—'} · {new Date(t.created_at).toLocaleString('es-MX')}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted shrink-0">{t.categoria} · {t.prioridad}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <TicketDetail ticket={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); refresh(); }} />}
    </div>
  );
}

function TicketDetail({ ticket, onClose, onSaved }: { ticket: Ticket; onClose: () => void; onSaved: () => void }) {
  const [respuesta, setRespuesta] = useState('');
  const [busy, setBusy] = useState(false);

  const responder = async () => {
    if (!respuesta.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/tickets/${ticket.id}/responder`, { mensaje: respuesta });
      toast.success('Respuesta enviada');
      onSaved();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Error'); }
    finally { setBusy(false); }
  };
  const cerrar = async () => {
    if (!confirm('Cerrar este ticket?')) return;
    await api.post(`/admin/tickets/${ticket.id}/cerrar`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white rounded-3xl border border-line p-6 max-h-[85vh] overflow-y-auto">
        <h3 className="ce-display font-bold text-xl">{ticket.asunto}</h3>
        <p className="text-xs text-muted mt-1">{ticket.local?.nombre} · {ticket.user?.email}</p>

        <div className="mt-5 space-y-2">
          {ticket.messages.map((m) => (
            <div key={m.id} className={cn('rounded-2xl p-3 text-sm', m.from_super ? 'bg-emerald-50 ml-12' : 'bg-line/30 mr-12')}>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted mb-1">
                {m.from_super ? 'Soporte' : 'Cliente'} · {new Date(m.created_at).toLocaleString('es-MX')}
              </p>
              <p className="whitespace-pre-wrap">{m.mensaje}</p>
            </div>
          ))}
        </div>

        {ticket.estado !== 'cerrado' && (
          <div className="mt-5 pt-4 border-t border-line">
            <textarea
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Escribe tu respuesta…"
              rows={4}
              className="w-full px-3 py-2 border border-line rounded-xl bg-white text-sm resize-none"
              maxLength={5000}
            />
            <div className="flex gap-2 mt-2">
              <Button onClick={responder} loading={busy} disabled={!respuesta.trim()}>Responder</Button>
              <Button variant="secondary" onClick={cerrar}>Cerrar ticket</Button>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
