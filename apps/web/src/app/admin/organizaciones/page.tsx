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

interface Local {
  id: number;
  nombre: string;
}

interface Organization {
  id: number;
  nombre: string;
  owner_user_id: number;
  locales: Local[];
}

/**
 * Administración de sucursales consolidadas (ver ADR-014) — sólo super_admin.
 * v1: IDs de usuario/local se escriben a mano (consultar /admin/locales para
 * ver los IDs) — sin buscador/autocomplete todavía.
 */
export default function OrganizacionesPage() {
  const [items, setItems] = useState<Organization[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [asignandoA, setAsignandoA] = useState<Organization | null>(null);

  const refresh = async () => {
    const { data } = await api.get<{ data: Organization[] }>('/admin/organizations');
    setItems(data.data);
  };
  useEffect(() => { refresh(); }, []);

  const desasignar = async (org: Organization, local: Local) => {
    if (!confirm(`¿Quitar "${local.nombre}" de "${org.nombre}"?`)) return;
    try {
      await api.delete(`/admin/organizations/${org.id}/locales/${local.id}`);
      refresh();
    } catch {
      toast.error('No se pudo quitar');
    }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Negocios" kickerIcon="store"
        title="Organizaciones" titleAccent="sucursales consolidadas."
        description="Agrupa varios Locales de un mismo dueño para que vean un reporte de cadena consolidado (/admin/cadena)."
        actions={<Button onClick={() => setCreating(true)}>+ Nueva organización</Button>}
      />

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="storefront" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Sin organizaciones todavía</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((org) => (
            <div key={org.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="ce-display font-bold">{org.nombre}</p>
                  <p className="text-xs text-muted">Dueño: user #{org.owner_user_id}</p>
                </div>
                <Button size="sm" onClick={() => setAsignandoA(org)}>+ Asignar local</Button>
              </div>
              {org.locales.length === 0 ? (
                <p className="text-sm text-muted">Sin sucursales asignadas.</p>
              ) : (
                <ul className="text-sm divide-y divide-line">
                  {org.locales.map((l) => (
                    <li key={l.id} className="py-1.5 flex items-center justify-between">
                      <span>{l.nombre} <span className="text-muted">#{l.id}</span></span>
                      <Button size="sm" variant="ghost" onClick={() => desasignar(org, l)}>Quitar</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <CrearOrgModal open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />
      {asignandoA && (
        <AsignarLocalModal
          org={asignandoA}
          onClose={() => setAsignandoA(null)}
          onSaved={() => { setAsignandoA(null); refresh(); }}
        />
      )}
    </div>
  );
}

function CrearOrgModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setNombre(''); setOwnerUserId(''); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/organizations', { nombre, owner_user_id: Number(ownerUserId) });
      toast.success('Organización creada');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo crear');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva organización" size="sm">
      <form onSubmit={submit}>
        <Field label="Nombre de la cadena" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Cadena de Tacos" />
        <Field
          label="ID del usuario dueño"
          type="number" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} required
          hint="Consulta el ID en /admin/locales → columna owner del local principal."
        />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function AsignarLocalModal({
  org, onClose, onSaved,
}: { org: Organization; onClose: () => void; onSaved: () => void }) {
  const [localId, setLocalId] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/admin/organizations/${org.id}/locales`, { local_id: Number(localId) });
      toast.success('Local asignado');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo asignar');
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Asignar local a "${org.nombre}"`} size="sm">
      <form onSubmit={submit}>
        <Field
          label="ID del local" type="number" value={localId} onChange={(e) => setLocalId(e.target.value)} required
          hint="Consulta el ID en /admin/locales."
        />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Asignar</Button>
        </div>
      </form>
    </Modal>
  );
}
