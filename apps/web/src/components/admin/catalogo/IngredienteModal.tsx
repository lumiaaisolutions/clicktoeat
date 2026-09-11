'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Ingrediente, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Select, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { InfoBox } from '@/components/ui/InfoBox';

const UNIDADES = ['pz', 'kg', 'g', 'l', 'ml'] as const;

export function IngredienteModal({
  open, onClose, onSaved, ingrediente,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  ingrediente?: Ingrediente;
}) {
  const [nombre, setNombre] = useState('');
  const [stock, setStock] = useState(0);
  const [stockMin, setStockMin] = useState(0);
  const [unidad, setUnidad] = useState<typeof UNIDADES[number]>('pz');
  const [costo, setCosto] = useState(0);
  const [activo, setActivo] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(ingrediente?.nombre ?? '');
    setStock(ingrediente?.stock ?? 0);
    setStockMin(ingrediente?.stock_minimo ?? 0);
    setUnidad(ingrediente?.unidad ?? 'pz');
    setCosto(ingrediente?.costo_unitario ?? 0);
    setActivo(ingrediente?.activo ?? true);
    setErrors({});
  }, [open, ingrediente]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        nombre, stock, stock_minimo: stockMin, unidad, costo_unitario: costo, activo,
      };
      if (ingrediente) {
        await api.patch<Resource<Ingrediente>>(`/ingredientes/${ingrediente.id}`, payload);
        toast.success('Ingrediente actualizado');
      } else {
        await api.post<Resource<Ingrediente>>('/ingredientes', payload);
        toast.success('Ingrediente creado');
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
    <Modal open={open} onClose={onClose} title={ingrediente ? 'Editar ingrediente' : 'Nuevo ingrediente'}>
      <form onSubmit={onSubmit}>
        <InfoBox className="mb-4">
          Un insumo es lo que usas para <strong>preparar tus platillos</strong>
          (tortillas, carne, refrescos…). Llevar su inventario te avisa cuándo
          reponer y se descuenta solo con cada venta.
        </InfoBox>
        <Field data-tour="inventario-modal-nombre" label="Nombre del insumo" placeholder="ej. Tortillas, Carne, Queso" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errors.nombre} required maxLength={80} />
        <div className="grid grid-cols-2 gap-3">
          <Field data-tour="inventario-modal-stock" label="¿Cuánto tienes ahora?" type="number" step="0.001" value={stock} onChange={(e) => setStock(Number(e.target.value))} error={errors.stock} required />
          <Select label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value as any)} error={errors.unidad}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field data-tour="inventario-modal-minimo" label="Avisarme cuando queden" type="number" step="0.001" value={stockMin} onChange={(e) => setStockMin(Number(e.target.value))} error={errors.stock_minimo} hint="Te avisamos al llegar a esta cantidad." />
          <Field label="Costo por unidad ($)" type="number" step="0.01" value={costo} onChange={(e) => setCosto(Number(e.target.value))} error={errors.costo_unitario} hint="Lo que te cuesta a ti. Opcional." />
        </div>
        <Switch label="En uso" hint="Apágalo si dejaste de usar este insumo (no se borra)." checked={activo} onChange={setActivo} />
        <div className="flex gap-2 justify-end mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button data-tour="inventario-modal-guardar" type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
