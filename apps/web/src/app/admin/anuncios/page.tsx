'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Switch } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface Anuncio {
  id: number;
  titulo: string;
  body: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export default function AnunciosPage() {
  const [items, setItems] = useState<Anuncio[] | null>(null);
  const [open,  setOpen]  = useState<Anuncio | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    setItems(null);
    api.get<{ data: Anuncio[] }>('/admin/anuncios').then(({ data }) => setItems(data.data));
  };
  useEffect(refresh, []);

  const del = async (a: Anuncio) => {
    if (!confirm(`Borrar "${a.titulo}"?`)) return;
    await api.delete(`/admin/anuncios/${a.id}`);
    refresh();
    toast.success('Eliminado');
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Anuncios"
        kickerIcon="bell"
        title="Comunica a"
        titleAccent="todos tus locales."
        description="Aparecen como banner en el panel de cada owner/staff. Útil para mantenimientos, lanzamientos, cambios."
        actions={<Button onClick={() => setCreating(true)}><Icon name="plus" size={14} className="mr-1.5" />Nuevo anuncio</Button>}
      />

      {!items ? (
        <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center text-muted">
          Sin anuncios todavía. Crea uno para que aparezca en el panel de tus locales.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className={cn(
              'rounded-2xl border-2 p-4 bg-white',
              a.active ? 'border-line' : 'border-line opacity-50',
            )}>
              <div className="flex items-start gap-3">
                <span className={cn(
                  'w-9 h-9 rounded-xl grid place-items-center shrink-0 text-sm font-bold',
                  a.severity === 'danger'  ? 'bg-red-100 text-red-700'
                  : a.severity === 'warning' ? 'bg-amber-100 text-amber-700'
                  : a.severity === 'success' ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700',
                )}>!</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{a.titulo}</p>
                  <p className="text-sm text-muted mt-1">{a.body}</p>
                  <p className="text-[11px] text-muted mt-2">
                    {a.active ? 'Activo' : 'Inactivo'}
                    {a.starts_at && ` · desde ${new Date(a.starts_at).toLocaleString('es-MX')}`}
                    {a.ends_at && ` · hasta ${new Date(a.ends_at).toLocaleString('es-MX')}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setOpen(a)} className="text-xs px-3 py-1.5 rounded-lg border border-line hover:bg-line/30">Editar</button>
                  <button onClick={() => del(a)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Borrar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || open) && (
        <AnuncioModal
          anuncio={open}
          onClose={() => { setCreating(false); setOpen(null); }}
          onSaved={() => { setCreating(false); setOpen(null); refresh(); }}
        />
      )}
    </div>
  );
}

function AnuncioModal({ anuncio, onClose, onSaved }: { anuncio: Anuncio | null; onClose: () => void; onSaved: () => void }) {
  const [titulo, setTitulo] = useState(anuncio?.titulo ?? '');
  const [body,   setBody]   = useState(anuncio?.body ?? '');
  const [severity, setSeverity] = useState<string>(anuncio?.severity ?? 'info');
  const [active, setActive] = useState(anuncio?.active ?? true);
  const [startsAt, setStartsAt] = useState(anuncio?.starts_at?.slice(0, 16) ?? '');
  const [endsAt, setEndsAt] = useState(anuncio?.ends_at?.slice(0, 16) ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      titulo, body, severity, active,
      starts_at: startsAt || null,
      ends_at:   endsAt || null,
    };
    try {
      if (anuncio) await api.patch(`/admin/anuncios/${anuncio.id}`, payload);
      else        await api.post('/admin/anuncios', payload);
      toast.success('Guardado');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur grid place-items-center p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-line shadow-glass p-5 space-y-3"
      >
        <h3 className="ce-display font-bold text-lg">{anuncio ? 'Editar anuncio' : 'Nuevo anuncio'}</h3>
        <Field label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={120} />
        <Textarea label="Mensaje" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={2000} />
        <div>
          <label className="text-sm font-medium mb-1 block">Tipo</label>
          <div className="grid grid-cols-4 gap-1">
            {(['info', 'success', 'warning', 'danger'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={cn(
                  'px-2 py-2 rounded-lg text-xs font-semibold border',
                  severity === s ? 'bg-ink text-white border-transparent' : 'bg-white border-line hover:border-ink/30',
                )}
              >{s}</button>
            ))}
          </div>
        </div>
        <Switch label="Activo" checked={active} onChange={setActive} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Desde (opc.)" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <Field label="Hasta (opc.)" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </div>
  );
}
