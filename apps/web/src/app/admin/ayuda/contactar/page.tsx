'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

interface Msg { id: number; mensaje: string; from_super: boolean; created_at: string; }
interface Ticket {
  id: number;
  asunto: string;
  categoria: string;
  prioridad: string;
  estado: 'abierto' | 'respondido' | 'cerrado';
  created_at: string;
  messages: Msg[];
}

export default function ContactarPage() {
  const [items, setItems] = useState<Ticket[] | null>(null);
  const [asunto,    setAsunto]    = useState('');
  const [body,      setBody]      = useState('');
  const [categoria, setCategoria] = useState('soporte');
  const [prioridad, setPrioridad] = useState('media');
  const [sending,   setSending]   = useState(false);

  const refresh = () => {
    setItems(null);
    api.get<{ data: Ticket[] }>('/soporte/tickets')
      .then(({ data }) => setItems(data.data ?? (data as any)))
      .catch(() => setItems([]));
  };
  useEffect(refresh, []);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/soporte/tickets', { asunto, mensaje: body, categoria, prioridad });
      toast.success('Ticket enviado. Te responderemos por correo y aquí mismo.');
      setAsunto(''); setBody('');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo enviar');
    } finally { setSending(false); }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Contactar soporte"
        kickerIcon="help"
        title="¿Necesitas"
        titleAccent="ayuda?"
        description="Abre un ticket y nuestro equipo te responde aquí mismo y por correo. Para urgencias usa el botón de WhatsApp."
      />

      <form onSubmit={crear} className="rounded-3xl border border-line bg-white p-5 mb-6 space-y-3">
        <Field label="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} required maxLength={200} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2 border border-line rounded-xl bg-white">
              <option value="soporte">Soporte general</option>
              <option value="bug">Reportar un bug</option>
              <option value="facturacion">Facturación / pago</option>
              <option value="feature">Sugerir mejora</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Prioridad</label>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full px-3 py-2 border border-line rounded-xl bg-white">
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
        <Textarea label="Cuéntanos qué pasa" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={5000} rows={6} />
        <Button type="submit" loading={sending}>Enviar ticket</Button>
      </form>

      <h2 className="ce-display font-bold text-lg mb-3">Tus tickets</h2>
      {!items ? <Skeleton className="h-40" /> : items.length === 0 ? (
        <p className="text-sm text-muted">Sin tickets todavía.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <span className={cn(
                  'text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full',
                  t.estado === 'abierto'    ? 'bg-amber-100 text-amber-800'
                  : t.estado === 'respondido' ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800',
                )}>{t.estado}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{t.asunto}</p>
                  <p className="text-xs text-muted">{new Date(t.created_at).toLocaleString('es-MX')} · {t.categoria} · {t.prioridad}</p>
                </div>
              </div>
              {t.messages.length > 0 && (
                <div className="mt-3 space-y-2">
                  {t.messages.map((m) => (
                    <div key={m.id} className={cn('rounded-xl p-3 text-sm', m.from_super ? 'bg-emerald-50' : 'bg-line/30')}>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted mb-1">
                        {m.from_super ? 'Soporte' : 'Tú'} · {new Date(m.created_at).toLocaleString('es-MX')}
                      </p>
                      <p className="whitespace-pre-wrap">{m.mensaje}</p>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
