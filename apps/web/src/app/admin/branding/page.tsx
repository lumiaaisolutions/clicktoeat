'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { LocalAdmin, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Switch } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { LocationPicker } from '@/components/admin/LocationPicker';

export default function BrandingPage() {
  const [local, setLocal] = useState<LocalAdmin | null>(null);
  const [draft, setDraft] = useState<Partial<LocalAdmin>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Resource<LocalAdmin>>('/local').then(({ data }) => {
      setLocal(data.data);
      setDraft(data.data);
    });
  }, []);

  const set = <K extends keyof LocalAdmin>(key: K, value: LocalAdmin[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onSave = async () => {
    setErrors({});
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        nombre: draft.nombre,
        tagline: draft.tagline,
        logo_url: draft.logo_url,
        banner_url: draft.banner_url,
        color_primario: draft.color_primario,
        color_secundario: draft.color_secundario,
        color_fondo: draft.color_fondo,
        tipografia: draft.tipografia,
        dark_mode: draft.dark_mode,
        whatsapp: draft.whatsapp,
        telefono: draft.telefono,
        direccion: draft.direccion,
        delivery_fee: draft.delivery_fee,
        delivery_min_minutos: draft.delivery_min_minutos,
        delivery_radio_km: draft.delivery_radio_km,
        metodos_pago: draft.metodos_pago ?? ['efectivo', 'tarjeta_entrega', 'transferencia'],
        redes_sociales: draft.redes_sociales,
        lat: draft.lat,
        lng: draft.lng,
      };
      const { data } = await api.patch<Resource<LocalAdmin>>('/local', payload);
      setLocal(data.data);
      setDraft(data.data);
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

  if (!local) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const previewVars = {
    ['--ce-accent' as any]: draft.color_primario ?? local.color_primario,
    background: draft.color_fondo ?? local.color_fondo,
    color: draft.color_secundario ?? local.color_secundario,
  };

  return (
    <div>
      {/* HERO estilo landing — kicker + headline grande + tagline + CTA save */}
      <header className="relative mb-8 sm:mb-10 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white via-[color:var(--ce-bg)] to-white px-6 sm:px-8 py-8 sm:py-10">
        {/* Orbs decorativos sutiles — mismo lenguaje visual del landing */}
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-40">
          <div className="hero-orb" style={{ background: '#FF2D2D', width: 280, height: 280, top: -100, right: -60 }} />
          <div className="hero-orb" style={{ background: '#10b981', width: 220, height: 220, bottom: -100, left: '20%', opacity: 0.4 }} />
        </div>

        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
              <Icon name="sparkles" size={14} className="text-[color:var(--ce-accent)]" />
              Branding
            </p>
            <h1 className="ce-display mt-2 text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight">
              Personaliza cómo se ve<br />
              <span className="gradient-text">tu landing pública.</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted">
              Identidad, imágenes, colores, contacto y redes — todo lo que tu cliente verá al abrir tu URL.
            </p>
          </div>

          {/* CTA save con estilo del landing */}
          <button
            onClick={onSave}
            disabled={saving}
            className={cn(
              'group inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm sm:text-base font-medium transition tap-target shrink-0',
              saving ? 'bg-ink/50 cursor-wait' : 'bg-ink hover:bg-ink/90 shadow-lg',
            )}
          >
            {saving ? (
              <>
                <Icon name="compass" size={16} className="animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Icon name="check" size={16} />
                Guardar cambios
                <Icon name="arrow-right" size={16} className="group-hover:translate-x-0.5 transition" />
              </>
            )}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-6">
          <Section title="Identidad" icon="sparkles" hint="Nombre y descripción corta que se muestran en tu landing.">
            <Field label="Nombre" value={draft.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} error={errors.nombre} />
            <Textarea label="Tagline" value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} error={errors.tagline} maxLength={200} />
          </Section>

          <Section title="Imágenes" icon="storefront" hint="Logo y banner del local. JPG, PNG o WebP — máx 5 MB.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="block text-sm font-medium mb-1">Logo</p>
                <ImageUpload
                  value={draft.logo_url ?? null}
                  folder="logos"
                  aspect="square"
                  onChange={(v) => set('logo_url', v.url)}
                />
              </div>
              <div>
                <p className="block text-sm font-medium mb-1">Banner</p>
                <ImageUpload
                  value={draft.banner_url ?? null}
                  folder="banners"
                  aspect="wide"
                  onChange={(v) => set('banner_url', v.url)}
                />
              </div>
            </div>
          </Section>

          <Section title="Colores" icon="qr-code" hint="Paleta de tu marca. Se aplican a la landing en tiempo real.">
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Primario"   value={draft.color_primario   ?? ''} onChange={(v) => set('color_primario', v)}   error={errors.color_primario}   />
              <ColorField label="Secundario" value={draft.color_secundario ?? ''} onChange={(v) => set('color_secundario', v)} error={errors.color_secundario} />
              <ColorField label="Fondo"      value={draft.color_fondo      ?? ''} onChange={(v) => set('color_fondo', v)}      error={errors.color_fondo}      />
            </div>
            <Switch
              label="Dark mode"
              hint="Activa el tema oscuro en la landing"
              checked={!!draft.dark_mode}
              onChange={(v) => set('dark_mode', v)}
            />
          </Section>

          <Section title="Contacto y operación" icon="phone" hint="WhatsApp, dirección y métodos de pago aceptados.">
            <Field label="WhatsApp" value={draft.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} hint="Sólo dígitos, con LADA (p.ej. 5215512345678)" error={errors.whatsapp} />
            <Field label="Teléfono" value={draft.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} error={errors.telefono} />
            <div>
              <p className="block text-sm font-medium mb-1">Dirección</p>
              <LocationPicker
                value={{ direccion: draft.direccion ?? '', lat: draft.lat ?? null, lng: draft.lng ?? null }}
                onChange={(v) => setDraft((d) => ({ ...d, direccion: v.direccion, lat: v.lat, lng: v.lng }))}
              />
              {errors.direccion && <span className="text-xs text-red-600">{errors.direccion}</span>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Envío (MXN)" type="number" step="0.01" value={draft.delivery_fee ?? 0} onChange={(e) => set('delivery_fee', Number(e.target.value))} error={errors.delivery_fee} />
              <Field label="Tiempo mín. (min)" type="number" value={draft.delivery_min_minutos ?? 0} onChange={(e) => set('delivery_min_minutos', Number(e.target.value))} error={errors.delivery_min_minutos} />
              <Field label="Radio (km)" type="number" value={draft.delivery_radio_km ?? 5} onChange={(e) => set('delivery_radio_km', Number(e.target.value))} error={errors.delivery_radio_km} hint="Distancia máx. de entrega" />
            </div>

            {/* Métodos de pago */}
            <div>
              <p className="block text-sm font-medium mb-2">Métodos de pago aceptados</p>
              <div className="flex flex-col gap-2">
                {([
                  { value: 'efectivo',        label: 'Efectivo' },
                  { value: 'tarjeta_entrega', label: 'Tarjeta a la entrega' },
                  { value: 'transferencia',   label: 'Transferencia / SPEI' },
                ] as const).map(({ value, label }) => {
                  const activos = draft.metodos_pago ?? ['efectivo', 'tarjeta_entrega', 'transferencia'];
                  const checked = activos.includes(value);
                  const toggle = () => {
                    const next = checked
                      ? activos.filter((m) => m !== value)
                      : [...activos, value];
                    set('metodos_pago', next.length ? next : activos); // al menos uno
                  };
                  return (
                    <label key={value} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line cursor-pointer hover:bg-line/30 transition select-none">
                      <input type="checkbox" checked={checked} onChange={toggle} className="w-4 h-4 rounded accent-amber-500" />
                      <span className="text-sm">{label}</span>
                    </label>
                  );
                })}
              </div>
              {(draft.metodos_pago ?? []).length === 0 && (
                <p className="text-xs text-red-500 mt-1">Selecciona al menos un método de pago.</p>
              )}
            </div>
          </Section>

          <Section title="Redes sociales" icon="instagram" hint="Usuario o URL completa. Aparece en el footer de tu landing.">
            <Field label="Instagram" value={draft.redes_sociales?.ig ?? ''} onChange={(e) => set('redes_sociales', { ...draft.redes_sociales, ig: e.target.value })} />
            <Field label="Facebook"  value={draft.redes_sociales?.fb ?? ''} onChange={(e) => set('redes_sociales', { ...draft.redes_sociales, fb: e.target.value })} />
            <Field label="TikTok"    value={draft.redes_sociales?.tt ?? ''} onChange={(e) => set('redes_sociales', { ...draft.redes_sociales, tt: e.target.value })} />
          </Section>
        </div>

        {/* Live preview — refleja el rediseño real de la landing /[slug] */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6">
            <p className="text-xs uppercase tracking-wider text-muted mb-2">Vista previa</p>
            <div className="rounded-3xl border border-line overflow-hidden shadow-soft bg-surface" style={previewVars}>
              {/* HERO con banner + gradient overlay + logo + nombre + pill abierto */}
              <div className="relative h-44 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: draft.banner_url ? `url(${draft.banner_url})` : undefined,
                    background: !draft.banner_url ? 'linear-gradient(135deg, #ddd, #f3f3ee)' : undefined,
                  }}
                />
                {/* Gradient overlay para legibilidad */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                {/* Pill ABIERTO superior izquierda */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/95 text-white text-[10px] font-semibold backdrop-blur shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white halo-pulse" />
                    Abierto
                  </span>
                </div>
                {/* Logo + Nombre inferior */}
                <div className="absolute left-3 right-3 bottom-3 text-white">
                  {draft.logo_url && (
                    <img
                      src={draft.logo_url}
                      className="w-11 h-11 rounded-xl border-2 border-white shadow-md bg-white object-cover mb-2"
                      alt=""
                    />
                  )}
                  <div className="ce-display font-bold text-lg leading-tight truncate">
                    {draft.nombre || 'Tu local'}
                  </div>
                  {draft.tagline && (
                    <p className="text-[10px] opacity-90 line-clamp-1 mt-0.5">{draft.tagline}</p>
                  )}
                </div>
              </div>

              {/* CHIPS de categorías */}
              <div className="px-3 pt-3 pb-1 flex gap-1.5 overflow-hidden">
                {['Destacados', 'Bebidas', 'Postres'].map((c, i) => (
                  <span
                    key={c}
                    className={cn(
                      'text-[9px] font-medium px-2 py-1 rounded-full whitespace-nowrap border',
                      i === 0
                        ? 'text-white border-transparent'
                        : 'bg-surface border-line text-ink/70',
                    )}
                    style={i === 0 ? { background: 'var(--ce-accent)' } : undefined}
                  >
                    {c}
                  </span>
                ))}
              </div>

              {/* PRODUCTO card mini */}
              <div className="px-3 py-2">
                <div className="rounded-xl border border-line bg-surface p-2 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">Producto destacado</p>
                    <p className="text-[10px] text-muted">$ 0.00</p>
                  </div>
                  <div
                    className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg text-white font-bold"
                    style={{ background: 'var(--ce-accent)' }}
                  >
                    Ver
                  </div>
                </div>
              </div>

              {/* Footer barra cart flotante mini */}
              <div className="px-3 pb-3 pt-1">
                <div
                  className="rounded-xl text-white text-[10px] font-semibold py-2 px-3 flex items-center justify-between"
                  style={{ background: 'var(--ce-accent)' }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-white/20 grid place-items-center text-[8px] font-bold">
                      1
                    </span>
                    producto
                  </span>
                  <span>$ 0.00 →</span>
                </div>
              </div>
            </div>

            <a
              href={local.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-1.5 w-full text-center text-sm underline hover:text-[color:var(--ce-accent)] transition"
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

function Section({
  title, children, icon, hint,
}: {
  title: string;
  children: React.ReactNode;
  icon?: 'sparkles' | 'utensils' | 'storefront' | 'instagram' | 'phone' | 'map-pin' | 'qr-code';
  hint?: string;
}) {
  return (
    <section className="group relative rounded-3xl border border-line bg-white p-5 sm:p-6 hover:border-ink/30 hover:shadow-glass transition-all duration-300">
      {/* Indicador accent rojo top-left que aparece on hover */}
      <span
        aria-hidden
        className="absolute top-0 left-6 w-12 h-[3px] rounded-b-full bg-[color:var(--ce-accent)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
      />

      <header className="flex items-start gap-3 mb-5 pb-4 border-b border-line">
        {icon && (
          <span className="shrink-0 w-11 h-11 rounded-2xl bg-[color:var(--ce-bg)] border border-line grid place-items-center text-ink/80 group-hover:bg-ink group-hover:text-white group-hover:border-transparent group-hover:scale-105 transition-all duration-300">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="ce-display font-bold text-lg leading-tight tracking-tight">{title}</h2>
          {hint && <p className="text-xs text-muted mt-0.5 leading-relaxed">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function ColorField({
  label, value, onChange, error,
}: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 w-10 h-10 rounded-lg border border-line cursor-pointer"
          style={{ backgroundColor: value || '#000000' }}
          aria-label={`Seleccionar color ${label}`}
        />
        <input
          ref={inputRef}
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="sr-only"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-2 py-2 border border-line rounded-lg font-mono text-sm bg-white"
          maxLength={9}
        />
      </div>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
}
