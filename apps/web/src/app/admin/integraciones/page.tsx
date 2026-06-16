'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { usePlan } from '@/store/plan';
import { cn } from '@/lib/utils';

interface Webhook {
  id: number;
  event: string;
  url:   string;
  secret: string;
  active: boolean;
  last_called_at: string | null;
  last_status:    number | null;
  last_error:     string | null;
  error_count:    number;
}

export default function IntegracionesPage() {
  const has = usePlan((s) => s.has);
  const enabled = has('api_webhooks');

  const [hooks,   setHooks]   = useState<Webhook[] | null>(null);
  const [url,     setUrl]     = useState('');
  const [saving,  setSaving]  = useState(false);

  const refresh = async () => {
    if (!enabled) { setHooks([]); return; }
    try {
      const { data } = await api.get<{ data: Webhook[] }>('/webhooks');
      setHooks(data.data);
    } catch { setHooks([]); }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [enabled]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setSaving(true);
    try {
      await api.post('/webhooks', { event: 'pedido.creado', url });
      setUrl('');
      toast.success('Webhook creado');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo crear');
    } finally { setSaving(false); }
  };

  const toggleActive = async (h: Webhook) => {
    await api.patch(`/webhooks/${h.id}`, { active: !h.active });
    refresh();
  };
  const eliminar = async (h: Webhook) => {
    if (!confirm(`Eliminar webhook a ${h.url}?`)) return;
    await api.delete(`/webhooks/${h.id}`);
    refresh();
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Integraciones"
        kickerIcon="settings"
        title="Conecta ClickToEat con"
        titleAccent="otros sistemas."
        description="Recibe los pedidos en tu sistema de cocina, ERP o app vía webhooks HTTP firmados."
      />

      {!enabled ? (
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-center">
          <Icon name="lock" size={24} className="mx-auto text-amber-700" />
          <p className="ce-display font-bold mt-2">Disponible en plan Premium</p>
          <p className="text-sm text-amber-800 mt-1">
            Los webhooks de salida requieren el plan Premium ($599 MXN/mes).
          </p>
          <a href="/admin/billing" className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-ink text-white text-sm font-semibold">
            Ver planes →
          </a>
        </div>
      ) : (
        <>
          <form onSubmit={crear} className="rounded-2xl border border-line bg-white p-5 mb-4">
            <p className="ce-display font-bold mb-2">Agregar webhook</p>
            <p className="text-xs text-muted mb-3">
              Te enviamos un POST a esa URL cada vez que llega un pedido nuevo. La firma viaja en el header{' '}
              <code className="bg-line/40 px-1 rounded">X-CTE-Signature</code> como HMAC-SHA256 del body usando el secret que generamos.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mi-sistema.com/webhooks/clicktoeat"
                className="flex-1 px-3 py-2 border border-line rounded-xl bg-white"
                required
              />
              <Button type="submit" loading={saving}>Agregar</Button>
            </div>
          </form>

          {!hooks ? (
            <Skeleton className="h-32" />
          ) : hooks.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
              Sin webhooks configurados.
            </div>
          ) : (
            <ul className="space-y-2">
              {hooks.map((h) => (
                <li key={h.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className={cn('w-9 h-9 rounded-xl grid place-items-center shrink-0',
                      h.active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600')}>
                      <Icon name={h.active ? 'check-circle' : 'lock'} size={14} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{h.url}</p>
                      <p className="text-xs text-muted">Evento: <code>{h.event}</code></p>
                      <p className="text-[11px] text-muted mt-1">
                        Secret: <code className="bg-line/40 px-1 rounded">{h.secret}</code>
                      </p>
                      {h.last_called_at && (
                        <p className="text-[11px] text-muted mt-1">
                          Último: {new Date(h.last_called_at).toLocaleString('es-MX')}{' '}
                          {h.last_status && <span>· HTTP {h.last_status}</span>}
                          {h.error_count > 0 && <span className="text-red-600 ml-1">· {h.error_count} errores</span>}
                        </p>
                      )}
                      {h.last_error && (
                        <p className="text-[11px] text-red-700 mt-1 truncate" title={h.last_error}>
                          Error: {h.last_error}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleActive(h)} className="text-xs px-3 py-1.5 rounded-lg border border-line hover:bg-line/30">
                        {h.active ? 'Pausar' : 'Activar'}
                      </button>
                      <button onClick={() => eliminar(h)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
