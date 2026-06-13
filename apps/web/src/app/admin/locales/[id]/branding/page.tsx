'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { LocalAdmin, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Switch } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { ImageUpload } from '@/components/admin/ImageUpload';

/**
 * Editor de branding para super_admin — actúa sobre cualquier local.
 * Es básicamente el mismo flujo que /admin/branding (owner) pero contra el
 * endpoint /admin/locales/{id} en lugar de /local.
 */
export default function SuperAdminBrandingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [local, setLocal] = useState<LocalAdmin | null>(null);
  const [draft, setDraft] = useState<Partial<LocalAdmin>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<Resource<LocalAdmin>>(`/admin/locales/${id}`)
      .then(({ data }) => { setLocal(data.data); setDraft(data.data); })
      .catch(() => toast.error('No se pudo cargar el local'));
  }, [id]);

  const set = <K extends keyof LocalAdmin>(key: K, value: LocalAdmin[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onSave = async () => {
    if (!id) return;
    setErrors({}); setSaving(true);
    try {
      const payload = {
        nombre:           draft.nombre,
        tagline:          draft.tagline,
        logo_url:         draft.logo_url,
        banner_url:       draft.banner_url,
        color_primario:   draft.color_primario,
        color_secundario: draft.color_secundario,
        color_fondo:      draft.color_fondo,
        tipografia:       draft.tipografia,
        dark_mode:        draft.dark_mode,
        whatsapp:         draft.whatsapp,
        telefono:         draft.telefono,
        direccion:        draft.direccion,
        delivery_fee:     draft.delivery_fee,
        delivery_min_minutos: draft.delivery_min_minutos,
        redes_sociales:   draft.redes_sociales,
      };
      const { data } = await api.patch<Resource<LocalAdmin>>(`/admin/locales/${id}`, payload);
      setLocal(data.data); setDraft(data.data);
      toast.success('Cambios guardados');
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      toast.error(err?.response?.data?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!local) return <div className="space-y-3"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;

  const previewVars: React.CSSProperties = {
    ['--ce-accent' as any]: draft.color_primario ?? local.color_primario,
    background: draft.color_fondo ?? local.color_fondo,
    color:      draft.color_secundario ?? local.color_secundario,
  };

  return (
    <div>
      <div className="mb-4 text-sm flex items-center gap-3">
        <Link href="/admin/locales" className="text-muted hover:underline">← Locales</Link>
        <span className="text-muted">·</span>
        <span className="font-medium">Branding</span>
        <span className="text-muted">·</span>
        <Link href={`/admin/locales/${id}/usuarios`} className="text-muted hover:underline">Usuarios</Link>
      </div>

      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="ce-display text-3xl md:text-4xl font-bold">Branding</h1>
          <p className="text-muted text-sm mt-1">
            Editando <strong>{local.nombre}</strong> · <code className="font-mono text-xs">/{local.slug}</code>
          </p>
        </div>
        <Button onClick={onSave} loading={saving}>Guardar cambios</Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Identidad">
            <Field label="Nombre" value={draft.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} error={errors.nombre} />
            <Textarea label="Tagline" value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} error={errors.tagline} maxLength={200} />
          </Section>

          <Section title="Imágenes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="block text-sm font-medium mb-1">Logo</p>
                <ImageUpload value={draft.logo_url ?? null} folder="logos" aspect="square" onChange={(v) => set('logo_url', v.url)} />
              </div>
              <div>
                <p className="block text-sm font-medium mb-1">Banner</p>
                <ImageUpload value={draft.banner_url ?? null} folder="banners" aspect="wide" onChange={(v) => set('banner_url', v.url)} />
              </div>
            </div>
          </Section>

          <Section title="Colorimetría">
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Primario"   value={draft.color_primario   ?? ''} onChange={(v) => set('color_primario', v)}   error={errors.color_primario}   />
              <ColorField label="Secundario" value={draft.color_secundario ?? ''} onChange={(v) => set('color_secundario', v)} error={errors.color_secundario} />
              <ColorField label="Fondo"      value={draft.color_fondo      ?? ''} onChange={(v) => set('color_fondo', v)}      error={errors.color_fondo}      />
            </div>
            <Switch label="Dark mode" hint="Tema oscuro en la landing" checked={!!draft.dark_mode} onChange={(v) => set('dark_mode', v)} />
          </Section>

          <Section title="Contacto & operación">
            <Field label="WhatsApp" value={draft.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} hint="Sólo dígitos, con LADA" error={errors.whatsapp} />
            <Field label="Teléfono" value={draft.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} error={errors.telefono} />
            <Textarea label="Dirección" value={draft.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} error={errors.direccion} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Envío (MXN)" type="number" step="0.01" value={draft.delivery_fee ?? 0} onChange={(e) => set('delivery_fee', Number(e.target.value))} error={errors.delivery_fee} />
              <Field label="Tiempo mínimo (min)" type="number" value={draft.delivery_min_minutos ?? 0} onChange={(e) => set('delivery_min_minutos', Number(e.target.value))} error={errors.delivery_min_minutos} />
            </div>
          </Section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-6">
            <p className="text-xs uppercase tracking-wider text-muted mb-2">Vista previa</p>
            <div className="rounded-3xl border border-line overflow-hidden shadow-soft" style={previewVars}>
              <div
                className="h-32 bg-cover bg-center"
                style={{
                  backgroundImage: draft.banner_url ? `url(${draft.banner_url})` : undefined,
                  background:      !draft.banner_url ? 'linear-gradient(135deg, #ddd, #f3f3ee)' : undefined,
                }}
              />
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {draft.logo_url && (
                    <img src={draft.logo_url} className="w-10 h-10 rounded-full border-2 border-white -mt-10 bg-white object-cover" alt="" />
                  )}
                  <div className="ce-display font-bold">{draft.nombre || local.nombre}</div>
                </div>
                <p className="text-xs mt-2 opacity-70">{draft.tagline || local.tagline || 'Tu tagline aparecerá aquí'}</p>
                <button className="mt-3 w-full py-2 rounded-xl text-white text-sm font-medium" style={{ background: 'var(--ce-accent)' }}>
                  Pedir por WhatsApp
                </button>
              </div>
            </div>
            <a
              href={local.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-1.5 w-full text-center text-sm underline"
            >
              Ver landing real
              <Icon name="arrow-up-right" size={13} />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="ce-display font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ColorField({
  label, value, onChange, error,
}: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 rounded-lg border border-line cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-2 border border-line rounded-lg font-mono text-sm bg-white"
          maxLength={9}
        />
      </div>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
