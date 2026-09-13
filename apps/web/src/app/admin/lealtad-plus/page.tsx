'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { CreateButton, DeleteButton } from '@/components/ui/actions';
import { Field } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Wizard } from '@/components/ui/Wizard';
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

  // El botón "Borrar" (hold-to-delete) ES la confirmación — sin confirm() nativo.
  const removeTier = async (t: Tier) => {
    await api.delete(`/lealtad-tiers/${t.id}`).then(refresh).catch(() => toast.error('No se pudo eliminar'));
  };
  const removeChallenge = async (c: Challenge) => {
    await api.delete(`/lealtad-challenges/${c.id}`).then(refresh).catch(() => toast.error('No se pudo eliminar'));
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Crecimiento" kickerIcon="sparkles"
        tourSlug="lealtad-plus"
        title="Lealtad+" titleAccent="niveles y retos."
        description="Extiende tu programa de sellos con niveles de beneficio y retos por tiempo limitado."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <section data-tour="lealtad-niveles">
          <div className="flex items-center justify-between mb-2">
            <h3 className="ce-display font-bold">Niveles</h3>
            <CreateButton onClick={() => setCreatingTier(true)} label="Nivel" className="px-3 py-2 text-xs" />
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
                  <DeleteButton compact onDelete={() => removeTier(t)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section data-tour="lealtad-retos">
          <div className="flex items-center justify-between mb-2">
            <h3 className="ce-display font-bold">Retos</h3>
            <CreateButton onClick={() => setCreatingChallenge(true)} label="Reto" className="px-3 py-2 text-xs" />
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
                  <DeleteButton compact onDelete={() => removeChallenge(c)} />
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  useEffect(() => { if (open) { setNombre(''); setCantidad('3'); setDias('7'); setPremio(''); setErrors({}); setStep(1); } }, [open]);

  const submit = async () => {
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

  // Paso 1: nombre y premio son obligatorios antes de definir el criterio.
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'Requerido';
    if (!premio.trim()) e.premio = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1) { if (validateStep1()) setStep(2); }
    else submit();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo reto" size="lg">
      <Wizard
        steps={['Reto y premio', 'Criterio']}
        current={step}
        onStep={setStep}
        kicker={`Paso ${step} de 2`}
        title={step === 1 ? '¿Qué reto y qué premio?' : '¿Cómo se gana?'}
        subtitle={step === 1
          ? 'Ponle un nombre atractivo y define la recompensa.'
          : 'Cuántos pedidos y en cuántos días para completarlo.'}
        onCancel={onClose}
        onBack={() => setStep(1)}
        onNext={handleNext}
        saving={saving}
        isLast={step === 2}
        submitLabel="Crear reto"
      >
        {step === 1 ? (
          <div className="space-y-3">
            <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="3 pedidos en 7 días" error={errors.nombre} />
            <Field label="Premio" value={premio} onChange={(e) => setPremio(e.target.value)} required placeholder="Postre gratis" error={errors.premio} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cantidad de pedidos" type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
            <Field label="En cuántos días" type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} required />
          </div>
        )}
      </Wizard>
    </Modal>
  );
}
