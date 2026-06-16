'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface Blast {
  id: number;
  asunto: string;
  body: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  started_at: string;
  finished_at: string | null;
  user: { nombre: string; email: string };
}

export default function NewsletterPage() {
  const [asunto, setAsunto] = useState('');
  const [body, setBody] = useState('');
  const [rol, setRol]   = useState<'owner' | 'super_admin' | 'todos'>('owner');
  const [sending, setSending] = useState(false);
  const [blasts, setBlasts] = useState<Blast[] | null>(null);

  const refresh = () => {
    api.get<{ data: Blast[] }>('/admin/newsletter').then(({ data }) => setBlasts(data.data));
  };
  useEffect(refresh, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Enviar este correo a ${rol === 'todos' ? 'TODOS los usuarios' : `todos los ${rol}s`}? Esto NO se puede deshacer.`)) return;
    setSending(true);
    try {
      await api.post('/admin/newsletter/send', { asunto, body, rol });
      toast.success('Newsletter enviado');
      setAsunto(''); setBody('');
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al enviar');
    } finally { setSending(false); }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Newsletter"
        kickerIcon="bell"
        title="Avisa a"
        titleAccent="todos los owners."
        description="Mensaje masivo por correo. Útil para anunciar nuevas features, cambios de precio o políticas."
      />

      <form onSubmit={send} className="rounded-3xl border border-line bg-white p-5 mb-6 space-y-3">
        <Field label="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} required maxLength={200} />
        <Textarea label="Mensaje (texto plano)" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={10000} rows={10} />
        <div>
          <label className="text-sm font-medium block mb-1">Enviar a</label>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setRol('owner')}       className={`px-3 py-2 rounded-lg text-xs font-semibold border ${rol === 'owner' ? 'bg-ink text-white' : 'bg-white border-line'}`}>Solo owners</button>
            <button type="button" onClick={() => setRol('super_admin')} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${rol === 'super_admin' ? 'bg-ink text-white' : 'bg-white border-line'}`}>Solo super admin</button>
            <button type="button" onClick={() => setRol('todos')}       className={`px-3 py-2 rounded-lg text-xs font-semibold border ${rol === 'todos' ? 'bg-ink text-white' : 'bg-white border-line'}`}>Todos</button>
          </div>
        </div>
        <div className="pt-3 border-t border-line">
          <Button type="submit" loading={sending}>Enviar ahora</Button>
        </div>
      </form>

      <h2 className="ce-display font-bold text-lg mb-3">Historial</h2>
      {!blasts ? <Skeleton className="h-40" /> : blasts.length === 0 ? (
        <p className="text-sm text-muted">Sin envíos todavía.</p>
      ) : (
        <ul className="space-y-2">
          {blasts.map((b) => (
            <li key={b.id} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-bold">{b.asunto}</p>
              <p className="text-xs text-muted mt-1">
                Por {b.user.nombre} · {new Date(b.started_at).toLocaleString('es-MX')}
              </p>
              <p className="text-xs mt-2">
                <span className="text-emerald-700">{b.sent_count} enviados</span>
                {b.failed_count > 0 && <span className="text-red-600 ml-2">{b.failed_count} fallaron</span>}
                <span className="text-muted ml-2">de {b.recipients_count} destinatarios</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
