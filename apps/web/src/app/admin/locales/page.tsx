'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { LocalAdmin, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

type EstadoFilter = 'todos' | 'activos' | 'suspendidos';

export default function LocalesAdminPage() {
  const [items, setItems] = useState<LocalAdmin[] | null>(null);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<EstadoFilter>('todos');
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setItems(null);
    const { data } = await api.get<{ data: LocalAdmin[] }>('/admin/locales', {
      params: { q: q || undefined, estado: estado !== 'todos' ? estado : undefined },
    });
    setItems(data.data);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [q, estado]);

  const toggleSuspendido = async (l: LocalAdmin) => {
    const action = l.suspendido ? 'reactivar' : 'suspender';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} "${l.nombre}"?`)) return;
    try {
      await api.post(`/admin/locales/${l.id}/${action}`);
      toast.success(`Local ${action === 'suspender' ? 'suspendido' : 'reactivado'}`);
      refresh();
    } catch {
      toast.error(`No se pudo ${action}`);
    }
  };

  const handleDelete = async (l: LocalAdmin) => {
    if (!confirm(`¿ELIMINAR el local "${l.nombre}"?\n\nQuedará oculto en todos lados, pero los datos se conservan (soft-delete).`)) return;
    try {
      await api.delete(`/admin/locales/${l.id}`);
      toast.success('Local eliminado');
      refresh();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="ce-display text-2xl md:text-4xl font-bold">Locales</h1>
          <p className="text-muted text-sm mt-1">Da de alta clientes nuevos, edita su branding, suspende cuentas.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nuevo local</Button>
      </header>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          placeholder="Buscar por nombre o slug…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-line rounded-xl bg-white"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoFilter)}
          className="px-3 py-2 border border-line rounded-xl bg-white"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="suspendidos">Suspendidos</option>
        </select>
      </div>

      <div className="rounded-2xl border border-line bg-white overflow-hidden">
        {items === null ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted text-sm">
            No hay locales que coincidan con el filtro.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((l) => (
              <li key={l.id} className="p-3 sm:p-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex-shrink-0"
                    style={{ background: l.color_primario }}
                    title={l.color_primario}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/${l.slug}`} target="_blank" className="font-medium hover:underline truncate">
                        {l.nombre}
                      </Link>
                      {l.suspendido && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap">
                          Suspendido
                        </span>
                      )}
                      {!l.activo && !l.suspendido && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium whitespace-nowrap">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted truncate">
                      /{l.slug} · {l.whatsapp}
                      {l.tagline && <span className="hidden sm:inline"> · {l.tagline}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 sm:flex sm:justify-end gap-1 mt-3 pt-3 border-t border-line sm:border-t-0 sm:pt-0 sm:mt-0">
                  <Link
                    href={`/admin/locales/${l.id}/branding`}
                    className="inline-flex items-center justify-center px-3 h-9 sm:h-8 text-xs sm:text-sm rounded-lg hover:bg-line/40"
                  >
                    Branding
                  </Link>
                  <Link
                    href={`/admin/locales/${l.id}/usuarios`}
                    className="inline-flex items-center justify-center px-3 h-9 sm:h-8 text-xs sm:text-sm rounded-lg hover:bg-line/40"
                  >
                    Usuarios
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSuspendido(l)}
                    className="!h-9 sm:!h-8"
                  >
                    {l.suspendido ? 'Reactivar' : 'Suspender'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(l)} className="!h-9 sm:!h-8">Borrar</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateLocalModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => { setCreating(false); refresh(); }}
      />
    </div>
  );
}

// ─── Modal de alta ──────────────────────────────────────────────
function CreateLocalModal({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [direccion, setDireccion] = useState('');
  const [colorPrimario, setColorPrimario] = useState('#FF2D2D');

  const [withOwner, setWithOwner] = useState(true);
  const [ownerNombre, setOwnerNombre] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(''); setSlug(''); setTagline(''); setWhatsapp(''); setDireccion('');
    setColorPrimario('#FF2D2D');
    setWithOwner(true); setOwnerNombre(''); setOwnerEmail(''); setOwnerPassword('');
    setErrors({});
  }, [open]);

  // Auto-genera slug del nombre
  useEffect(() => {
    if (!slug && nombre) {
      const auto = nombre.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(auto);
    }
  /* eslint-disable-next-line */ }, [nombre]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload: any = {
        nombre,
        slug: slug || undefined,
        tagline: tagline || undefined,
        whatsapp,
        direccion: direccion || undefined,
        color_primario: colorPrimario,
      };
      if (withOwner) {
        payload.owner = {
          nombre: ownerNombre,
          email: ownerEmail,
          password: ownerPassword,
          password_confirmation: ownerPassword,
        };
      }
      await api.post<Resource<LocalAdmin>>('/admin/locales', payload);
      toast.success(`Local "${nombre}" creado`);
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (!Object.keys(flat).length) {
        toast.error(err?.response?.data?.message ?? 'No se pudo crear');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dar de alta un local" size="lg">
      <form onSubmit={onSubmit}>
        <h3 className="ce-display font-bold mb-3">Local</h3>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required error={errors.nombre} maxLength={120} />
        <Field
          label="Slug (URL pública)"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          hint={`Quedará en /${slug || 'mi-local'}`}
          error={errors.slug}
          maxLength={80}
        />
        <Textarea label="Tagline (opcional)" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} error={errors.tagline} />
        <Field label="WhatsApp (con LADA, sólo dígitos)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} required hint="p.ej. 5215512345678" error={errors.whatsapp} maxLength={20} />
        <Field label="Dirección (opcional)" value={direccion} onChange={(e) => setDireccion(e.target.value)} error={errors.direccion} maxLength={300} />

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Color primario</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorPrimario}
              onChange={(e) => setColorPrimario(e.target.value.toUpperCase())}
              className="h-10 w-12 rounded-lg border border-line cursor-pointer"
            />
            <input
              type="text"
              value={colorPrimario}
              onChange={(e) => setColorPrimario(e.target.value)}
              className="flex-1 px-3 py-2 border border-line rounded-xl font-mono text-sm bg-white"
              maxLength={9}
            />
          </div>
          {errors.color_primario && <span className="block text-xs text-red-600 mt-1">{errors.color_primario}</span>}
        </div>

        <hr className="my-5 border-line" />

        <div className="flex items-center justify-between mb-3">
          <h3 className="ce-display font-bold">Owner del local</h3>
          <label className="text-sm flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={withOwner}
              onChange={(e) => setWithOwner(e.target.checked)}
            />
            Crear ahora
          </label>
        </div>

        {withOwner ? (
          <div className="rounded-xl border border-line p-4 mb-3">
            <Field label="Nombre del owner" value={ownerNombre} onChange={(e) => setOwnerNombre(e.target.value)} required={withOwner} error={errors['owner.nombre']} maxLength={120} />
            <Field label="Email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required={withOwner} error={errors['owner.email']} />
            <Field label="Contraseña" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} required={withOwner} hint="Mínimo 8 caracteres" error={errors['owner.password']} minLength={8} />
            <p className="text-xs text-muted mt-1">El owner recibirá acceso al panel del local. Puedes cambiarlo después.</p>
          </div>
        ) : (
          <p className="text-sm text-muted mb-3">El local quedará sin owner — podrás asignarle uno más tarde.</p>
        )}

        <div className="flex gap-2 justify-end pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Crear local</Button>
        </div>
      </form>
    </Modal>
  );
}
