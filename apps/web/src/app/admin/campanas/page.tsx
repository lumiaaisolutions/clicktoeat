'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface Campana {
  id: number;
  nombre: string;
  tipo: 'email' | 'push';
  asunto: string | null;
  mensaje: string;
  enviada_at: string | null;
  destinatarios_count: number | null;
}

export default function CampanasPage() {
  const [items, setItems] = useState<Campana[] | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    const { data } = await api.get<{ data: Campana[] }>('/campanas');
    setItems(data.data);
  };
  useEffect(() => { refresh(); }, []);

  const enviar = async (c: Campana) => {
    if (!confirm(`¿Enviar "${c.nombre}" a todos tus clientes con email registrado?`)) return;
    try {
      const { data } = await api.post(`/campanas/${c.id}/enviar`);
      toast.success(`Enviada a ${data.data.destinatarios_count} clientes`);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo enviar');
    }
  };

  const remove = async (c: Campana) => {
    if (!confirm(`¿Eliminar "${c.nombre}"?`)) return;
    try { await api.delete(`/campanas/${c.id}`); refresh(); } catch { toast.error('No se pudo eliminar'); }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Crecimiento" kickerIcon="message-circle"
        title="Campañas" titleAccent="para tu base de clientes."
        description="v1: sólo envío por email, a todos los clientes que dejaron su correo en algún pedido."
        actions={<Button onClick={() => setCreating(true)}>+ Nueva campaña</Button>}
      />

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="message-circle" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Aún no creas campañas</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{c.nombre}</p>
                  <p className="text-xs text-muted">
                    {c.enviada_at ? `Enviada a ${c.destinatarios_count} · ${new Date(c.enviada_at).toLocaleDateString('es-MX')}` : 'Borrador'}
                  </p>
                </div>
                {!c.enviada_at && (
                  <>
                    <Button size="sm" onClick={() => enviar(c)}>Enviar</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c)}>Borrar</Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <CampanaModal open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />
    </div>
  );
}

function CampanaModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setNombre(''); setAsunto(''); setMensaje(''); setErrors({}); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api.post('/campanas', { nombre, tipo: 'email', asunto, mensaje, segmento: 'todos' });
      toast.success('Campaña creada');
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (!Object.keys(flat).length) toast.error('No se pudo crear');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva campaña" size="md">
      <form onSubmit={submit}>
        <Field label="Nombre interno" value={nombre} onChange={(e) => setNombre(e.target.value)} required error={errors.nombre} placeholder="Promo julio" />
        <Field label="Asunto del email" value={asunto} onChange={(e) => setAsunto(e.target.value)} error={errors.asunto} placeholder="2x1 este fin de semana" />
        <Textarea label="Mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} required error={errors.mensaje} />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar borrador</Button>
        </div>
      </form>
    </Modal>
  );
}
