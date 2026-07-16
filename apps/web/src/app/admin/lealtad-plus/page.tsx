'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface Tier {
  id: number;
  nombre: string;
  sellos_requeridos: number;
  beneficio: string;
}
interface Challenge {
  id: number;
  nombre: string;
  premio: string;
  activo: boolean;
}

export default function LealtadPlusPage() {
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [creatingTier, setCreatingTier] = useState(false);
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  const refresh = async () => {
    const [t, c] = await Promise.all([
      api.get<{ data: Tier[] }>('/lealtad-tiers'),
      api.get<{ data: Challenge[] }>('/lealtad-challenges'),
    ]);
    setTiers(t.data.data);
    setChallenges(c.data.data);
  };
  useEffect(() => { refresh(); }, []);

  const removeTier = async (t: Tier) => {
    if (!confirm(`¿Eliminar el nivel "${t.nombre}"?`)) return;
    await api.delete(`/lealtad-tiers/${t.id}`).then(refresh).catch(() => toast.error('No se pudo eliminar'));
  };
  const removeChallenge = async (c: Challenge) => {
    if (!confirm(`¿Eliminar el reto "${c.nombre}"?`)) return;
    await api.delete(`/lealtad-challenges/${c.id}`).then(refresh).catch(() => toast.error('No se pudo eliminar'));
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Crecimiento" kickerIcon="sparkles"
        title="Lealtad+" titleAccent="niveles y retos."
        description="Extiende tu programa de sellos con niveles de beneficio y retos por tiempo limitado."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="ce-display font-bold">Niveles</h3>
            <Button size="sm" onClick={() => setCreatingTier(true)}>+ Nivel</Button>
          </div>
          {tiers === null ? <Skeleton className="h-24" /> : tiers.length === 0 ? (
            <p className="text-sm text-muted">Sin niveles todavía.</p>
          ) : (
            <ul className="rounded-2xl border border-line bg-white divide-y divide-line">
              {tiers.map((t) => (
                <li key={t.id} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{t.nombre} · {t.sellos_requeridos} sellos</p>
                    <p className="text-xs text-muted">{t.beneficio}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeTier(t)}>Borrar</Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="ce-display font-bold">Retos</h3>
            <Button size="sm" onClick={() => setCreatingChallenge(true)}>+ Reto</Button>
          </div>
          {challenges === null ? <Skeleton className="h-24" /> : challenges.length === 0 ? (
            <p className="text-sm text-muted">Sin retos todavía.</p>
          ) : (
            <ul className="rounded-2xl border border-line bg-white divide-y divide-line">
              {challenges.map((c) => (
                <li key={c.id} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{c.nombre}</p>
                    <p className="text-xs text-muted">{c.premio}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeChallenge(c)}>Borrar</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <TierModal open={creatingTier} onClose={() => setCreatingTier(false)} onSaved={() => { setCreatingTier(false); refresh(); }} />
      <ChallengeModal open={creatingChallenge} onClose={() => setCreatingChallenge(false)} onSaved={() => { setCreatingChallenge(false); refresh(); }} />
    </div>
  );
}

function TierModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [sellos, setSellos] = useState('10');
  const [beneficio, setBeneficio] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setNombre(''); setSellos('10'); setBeneficio(''); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/lealtad-tiers', { nombre, sellos_requeridos: Number(sellos), beneficio });
      toast.success('Nivel creado');
      onSaved();
    } catch { toast.error('No se pudo crear'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo nivel" size="sm">
      <form onSubmit={submit}>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Oro" />
        <Field label="Sellos requeridos" type="number" min={1} value={sellos} onChange={(e) => setSellos(e.target.value)} required />
        <Field label="Beneficio" value={beneficio} onChange={(e) => setBeneficio(e.target.value)} required placeholder="20% de descuento" />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function ChallengeModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('3');
  const [dias, setDias] = useState('7');
  const [premio, setPremio] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setNombre(''); setCantidad('3'); setDias('7'); setPremio(''); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/lealtad-challenges', {
        nombre, premio,
        criterio: { tipo: 'pedidos_en_dias', cantidad: Number(cantidad), dias: Number(dias) },
      });
      toast.success('Reto creado');
      onSaved();
    } catch { toast.error('No se pudo crear'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo reto" size="sm">
      <form onSubmit={submit}>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="3 pedidos en 7 días" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Cantidad de pedidos" type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
          <Field label="En cuántos días" type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} required />
        </div>
        <Field label="Premio" value={premio} onChange={(e) => setPremio(e.target.value)} required placeholder="Postre gratis" />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
