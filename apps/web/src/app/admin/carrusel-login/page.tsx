'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Switch } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface Slide {
  id: number;
  orden: number;
  activo: boolean;
  imagen_url: string | null;
  tags: string[] | null;
  quote: string;
  source: string | null;
  role: string | null;
}

export default function CarruselLoginPage() {
  const [items, setItems] = useState<Slide[] | null>(null);
  const [open, setOpen] = useState<Slide | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    setItems(null);
    api.get<{ data: Slide[] }>('/admin/auth-carousel').then(({ data }) => setItems(data.data));
  };
  useEffect(refresh, []);

  const del = async (s: Slide) => {
    if (!confirm('¿Borrar este slide del carrusel?')) return;
    await api.delete(`/admin/auth-carousel/${s.id}`);
    refresh();
    toast.success('Eliminado');
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Carrusel de login"
        kickerIcon="camera"
        title="Personaliza el"
        titleAccent="login y registro."
        description="Estos slides aparecen a la derecha de la pantalla de inicio de sesión y de registro, en toda la plataforma. Si no hay ninguno activo, se muestran los mensajes por defecto."
        actions={<Button onClick={() => setCreating(true)}><Icon name="plus" size={14} className="mr-1.5" />Nuevo slide</Button>}
      />

      {!items ? (
        <div className="space-y-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center text-muted">
          Sin slides. Se muestran los mensajes por defecto. Crea uno para personalizar el carrusel.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className={cn('rounded-2xl border-2 p-4 bg-white flex items-start gap-4', s.activo ? 'border-line' : 'border-line opacity-50')}>
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-line/40 shrink-0 grid place-items-center">
                {s.imagen_url
                  ? <img src={s.imagen_url} alt="" className="w-full h-full object-cover" />
                  : <Icon name="camera" size={18} className="text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="text-[11px] font-mono text-muted">#{s.orden}</span>
                  {(s.tags ?? []).map((t) => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-line/60">{t}</span>
                  ))}
                  {!s.activo && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Inactivo</span>}
                </div>
                <p className="text-sm font-medium truncate">“{s.quote}”</p>
                <p className="text-xs text-muted">{[s.source, s.role].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setOpen(s)} className="px-3 h-9 rounded-lg text-sm font-medium hover:bg-line/50">Editar</button>
                <button onClick={() => del(s)} className="px-3 h-9 rounded-lg text-sm font-medium hover:bg-red-50 text-red-600">Borrar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || open) && (
        <SlideModal
          slide={open}
          onClose={() => { setCreating(false); setOpen(null); }}
          onSaved={() => { setCreating(false); setOpen(null); refresh(); }}
        />
      )}
    </div>
  );
}

function SlideModal({ slide, onClose, onSaved }: { slide: Slide | null; onClose: () => void; onSaved: () => void }) {
  const [quote, setQuote] = useState(slide?.quote ?? '');
  const [source, setSource] = useState(slide?.source ?? '');
  const [role, setRole] = useState(slide?.role ?? '');
  const [tags, setTags] = useState((slide?.tags ?? []).join(', '));
  const [orden, setOrden] = useState(String(slide?.orden ?? 0));
  const [activo, setActivo] = useState(slide?.activo ?? true);
  const [imagenUrl, setImagenUrl] = useState<string | null>(slide?.imagen_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5 MB.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post<{ data: { url: string } }>('/admin/auth-carousel/upload', fd);
      setImagenUrl(data.data.url);
      toast.success('Imagen subida');
    } catch (e: any) {
      toast.error(e?.response?.data?.errors?.image?.[0] ?? 'No se pudo subir');
    } finally { setUploading(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      quote,
      source: source || null,
      role: role || null,
      imagen_url: imagenUrl,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4),
      orden: Number(orden) || 0,
      activo,
    };
    try {
      if (slide) await api.patch(`/admin/auth-carousel/${slide.id}`, payload);
      else await api.post('/admin/auth-carousel', payload);
      toast.success('Guardado');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl border border-line shadow-glass p-5 space-y-3 my-8">
        <h3 className="ce-display font-bold text-lg">{slide ? 'Editar slide' : 'Nuevo slide'}</h3>

        <div>
          <span className="block text-sm font-medium mb-1">Imagen (opcional)</span>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-line/40 grid place-items-center shrink-0">
              {imagenUrl ? <img src={imagenUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="camera" size={18} className="text-muted" />}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} loading={uploading}>
                {imagenUrl ? 'Cambiar' : 'Subir imagen'}
              </Button>
              {imagenUrl && (
                <button type="button" onClick={() => setImagenUrl(null)} className="text-xs text-red-600 hover:underline text-left">Quitar</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          </div>
        </div>

        <Textarea label="Frase / cita" value={quote} onChange={(e) => setQuote(e.target.value)} required maxLength={400} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fuente" value={source} onChange={(e) => setSource(e.target.value)} maxLength={120} placeholder="ClickToEat" />
          <Field label="Rol / detalle" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="Pedidos por WhatsApp" />
        </div>
        <Field label="Etiquetas (separadas por coma, máx. 4)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Sin comisiones, Directo a WhatsApp" />
        <div className="grid grid-cols-2 gap-2 items-end">
          <Field label="Orden" type="number" min={0} max={999} value={orden} onChange={(e) => setOrden(e.target.value)} />
          <Switch label="Activo" checked={activo} onChange={setActivo} />
        </div>

        <div className="flex gap-2 pt-2 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </div>
  );
}
