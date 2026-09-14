'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Modal } from '@/components/ui/Modal';
import { Wizard } from '@/components/ui/Wizard';
import { Field } from '@/components/ui/FormField';
import { InfoBox } from '@/components/ui/InfoBox';

const STEPS = ['Datos de la sucursal', 'Detalles (opcional)'];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se llama tras crear, con el id de la sucursal nueva (para refrescar el switcher). */
  onCreated?: (id: number) => void;
}

/**
 * Alta self-service de una sucursal (Premium). La nueva sucursal hereda el
 * branding del local actual y arranca con catálogo vacío; su cobro queda
 * incluido en el plan de la organización. Ver SucursalController + ADR-014.
 */
export function SucursalWizard({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: '', whatsapp: '', slug: '', direccion: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => {
    setStep(1);
    setForm({ nombre: '', whatsapp: '', slug: '', direccion: '' });
    setErrors({});
  };

  const close = () => { if (!saving) { reset(); onClose(); } };

  const next = async () => {
    if (step === 1) {
      const e: Record<string, string> = {};
      if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
      if (!form.whatsapp.trim()) e.whatsapp = 'El WhatsApp es obligatorio.';
      setErrors(e);
      if (Object.keys(e).length) return;
      setStep(2);
      return;
    }

    // Último paso → crear
    setSaving(true);
    setErrors({});
    try {
      const payload: Record<string, string> = { nombre: form.nombre.trim(), whatsapp: form.whatsapp.trim() };
      if (form.slug.trim()) payload.slug = form.slug.trim();
      if (form.direccion.trim()) payload.direccion = form.direccion.trim();

      const { data } = await api.post<{ data: { id: number }; message: string }>('/me/sucursales', payload);
      toast.success(data.message ?? 'Sucursal creada.');
      onCreated?.(data.data.id);
      reset();
      onClose();
    } catch (err: any) {
      const res = err?.response?.data;
      if (res?.errors) {
        const flat: Record<string, string> = {};
        Object.entries(res.errors).forEach(([k, v]) => { flat[k] = (v as string[])[0]; });
        setErrors(flat);
        setStep(1); // los errores de validación están en el paso 1
      } else if (res?.code === 'SUCURSAL_LIMIT_REACHED') {
        toast.error(res.message ?? 'Alcanzaste el límite de sucursales de tu plan.');
      } else {
        toast.error('No se pudo crear la sucursal. Intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Nueva sucursal" size="lg">
      <Wizard
        steps={STEPS}
        current={step}
        onStep={(n) => n < step && setStep(n)}
        title={step === 1 ? '¿Cómo se llama y por dónde recibe pedidos?' : 'Últimos detalles'}
        subtitle={
          step === 1
            ? 'Lo mínimo para publicar la sucursal.'
            : 'Opcionales — puedes ajustarlos después desde Branding.'
        }
        onCancel={close}
        onBack={() => setStep((s) => Math.max(1, s - 1))}
        onNext={next}
        saving={saving}
        isLast={step === 2}
        submitLabel="Crear sucursal"
      >
        {step === 1 ? (
          <>
            <Field
              label="Nombre de la sucursal"
              placeholder="Ej. Tacos El Gordo — Centro"
              value={form.nombre}
              onChange={set('nombre')}
              error={errors.nombre}
              autoFocus
            />
            <Field
              label="WhatsApp de la sucursal"
              placeholder="52 1 55 0000 0000"
              hint="A este número llegan los pedidos de esta ubicación."
              value={form.whatsapp}
              onChange={set('whatsapp')}
              error={errors.whatsapp}
            />
            <InfoBox>
              La sucursal hereda el logo, colores y tipografía de tu local actual, y
              arranca con el catálogo vacío para que cargues su menú. Queda incluida en
              tu plan sin cobro extra.
            </InfoBox>
          </>
        ) : (
          <>
            <Field
              label="Enlace (slug)"
              placeholder="se genera solo si lo dejas vacío"
              hint="Será la URL pública: tudominio.com/tu-slug"
              value={form.slug}
              onChange={set('slug')}
              error={errors.slug}
            />
            <Field
              label="Dirección"
              placeholder="Calle, número, colonia (opcional)"
              value={form.direccion}
              onChange={set('direccion')}
              error={errors.direccion}
            />
          </>
        )}
      </Wizard>
    </Modal>
  );
}
