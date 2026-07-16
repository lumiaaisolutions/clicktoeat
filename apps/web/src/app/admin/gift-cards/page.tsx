'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

interface GiftCard {
  id: number;
  codigo: string;
  monto_inicial: string;
  saldo: string;
  estado: 'activa' | 'agotada' | 'cancelada';
  comprador_email: string | null;
}

const ESTADO_COLOR: Record<GiftCard['estado'], string> = {
  activa: 'bg-emerald-100 text-emerald-700',
  agotada: 'bg-line text-muted',
  cancelada: 'bg-red-100 text-red-700',
};

export default function GiftCardsPage() {
  const [items, setItems] = useState<GiftCard[] | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    const { data } = await api.get<{ data: GiftCard[] }>('/gift-cards');
    setItems(data.data);
  };
  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <AdminPageHeader
        kicker="Crecimiento" kickerIcon="gift"
        title="Gift cards" titleAccent="para tus clientes."
        actions={<Button onClick={() => setCreating(true)}>+ Emitir gift card</Button>}
      />

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="gift" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Aún no emites gift cards</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((g) => (
              <li key={g.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-semibold text-sm">{g.codigo}</p>
                  <p className="text-xs text-muted">
                    Saldo ${g.saldo} de ${g.monto_inicial} {g.comprador_email ? `· ${g.comprador_email}` : ''}
                  </p>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', ESTADO_COLOR[g.estado])}>
                  {g.estado}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <GiftCardModal open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />
    </div>
  );
}

function GiftCardModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [monto, setMonto] = useState('500');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setMonto('500'); setEmail(''); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/gift-cards', { monto: Number(monto), comprador_email: email || undefined });
      toast.success('Gift card emitida');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo emitir');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Emitir gift card" size="sm">
      <form onSubmit={submit}>
        <Field label="Monto" type="number" min={1} value={monto} onChange={(e) => setMonto(e.target.value)} required />
        <Field label="Email del comprador (opcional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Emitir</Button>
        </div>
      </form>
    </Modal>
  );
}
