'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Categoria, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { InfoBox } from '@/components/ui/InfoBox';
import { IconPicker } from '@/components/ui/IconPicker';
import { type IconName } from '@/components/ui/Icon';

export function CategoriaModal({
  open, onClose, onSaved, categoria,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categoria?: Categoria;
}) {
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('');
  const [orden, setOrden] = useState(0);
  const [activo, setActivo] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(categoria?.nombre ?? '');
      setIcono(categoria?.icono ?? '');
      setOrden(categoria?.orden ?? 0);
      setActivo(categoria?.activo ?? true);
      setErrors({});
    }
  }, [open, categoria]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = { nombre, icono: icono || null, orden, activo };
      if (categoria) {
        await api.patch<Resource<Categoria>>(`/categorias/${categoria.id}`, payload);
        toast.success('Categoría actualizada');
      } else {
        await api.post<Resource<Categoria>>('/categorias', payload);
        toast.success('Categoría creada');
      }
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (!Object.keys(flat).length) toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={categoria ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <InfoBox>
          Las categorías son las <strong>secciones de tu menú</strong> (Tacos, Bebidas,
          Postres…). Agrupan tus platillos para que tus clientes encuentren todo fácil.
        </InfoBox>

        <Field data-tour="categoria-modal-nombre" label="Nombre de la categoría" placeholder="ej. Tacos, Bebidas, Postres" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errors.nombre} required maxLength={80} />

        <div data-tour="categoria-modal-icono">
          <IconPicker
            label="Icono"
            hint="Aparece junto al nombre en tu menú."
            value={(icono as IconName | '') || null}
            onChange={(v) => setIcono(v)}
          />
        </div>
        {errors.icono && <p className="text-xs text-red-600">{errors.icono}</p>}

        <Field label="Orden en el menú" type="number" value={orden} onChange={(e) => setOrden(Number(e.target.value))} error={errors.orden} hint="El número más bajo aparece primero (1, 2, 3…)." />
        <Switch label="Mostrar en el menú" hint="Si la apagas, no aparece en tu menú público (pero no se borra)." checked={activo} onChange={setActivo} />

        <div className="flex gap-2 justify-end pt-2 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button data-tour="categoria-modal-guardar" type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
