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

/**
 * Editor de branding compartido entre el panel del owner y el panel del
 * super_admin. Sin `localId` apunta a `/local` (sesión del owner). Con
 * `localId` apunta a `/admin/locales/{id}` (super editando a un cliente).
 */
export function BrandingEditor({ localId }: { localId?: number } = {}) {
  const fetchUrl  = localId ? `/admin/locales/${localId}` : '/local';
  const updateUrl = fetchUrl;

  const [local, setLocal] = useState<LocalAdmin | null>(null);
  const [draft, setDraft] = useState<Partial<LocalAdmin>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Resource<LocalAdmin>>(fetchUrl).then(({ data }) => {
      setLocal(data.data);
      setDraft(data.data);
    });
  }, [fetchUrl]);

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
        color_overrides: draft.color_overrides ?? null,
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
        // Lealtad
        lealtad_activo: !!draft.lealtad_activo,
        lealtad_meta:   draft.lealtad_meta ?? 10,
        lealtad_premio: draft.lealtad_premio ?? null,
      };
      const { data } = await api.patch<Resource<LocalAdmin>>(updateUrl, payload);
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

  // Si el user cambió la tipografía, inyectamos `--ce-display-font` aquí — el
  // CSS global (.ce-display) lo lee y la preview se actualiza al instante.
  const tipografiaActiva = draft.tipografia ?? local.tipografia ?? 'Bricolage Grotesque';
  const previewVars = {
    ['--ce-accent' as any]: draft.color_primario ?? local.color_primario,
    ['--ce-display-font' as any]: `"${tipografiaActiva}"`,
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
            <Textarea label="Eslogan" value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} error={errors.tagline} maxLength={200} hint="Frase corta debajo del nombre de tu local. Ej: 'Cocina de todos los días'." />
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

          {/* Plantillas — aplican paleta + tipografía + overrides en un click */}
          <Section title="Plantillas" icon="sparkles" hint="Comienza con un look listo. Después puedes ajustar lo que quieras.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LANDING_TEMPLATES.map((t) => {
                const active = draft.color_primario === t.primario && draft.tipografia === t.tipografia;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDraft((d) => ({
                      ...d,
                      color_primario:   t.primario,
                      color_secundario: t.secundario,
                      color_fondo:      t.fondo,
                      tipografia:       t.tipografia,
                      color_overrides:  t.overrides ?? null,
                    }))}
                    className={cn(
                      'relative rounded-2xl border-2 overflow-hidden text-left transition group',
                      active
                        ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-soft'
                        : 'border-line hover:border-ink/30',
                    )}
                  >
                    {active && (
                      <span className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-emerald-500 grid place-items-center text-white shadow">
                        <Icon name="check" size={11} />
                      </span>
                    )}
                    {/* Mini-preview de la landing */}
                    <div className="h-20 relative" style={{ background: t.fondo }}>
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="text-base font-bold" style={{ color: t.primario, fontFamily: `"${t.tipografia}", system-ui, sans-serif` }}>
                          Aa
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-2 flex">
                        <span className="flex-1" style={{ background: t.primario }} />
                        <span className="flex-1" style={{ background: t.secundario }} />
                      </div>
                    </div>
                    <div className={cn('p-2', active && 'bg-emerald-50/60')}>
                      <p className="text-[11px] font-bold leading-tight">{t.name}</p>
                      <p className="text-[10px] text-muted truncate">{t.tipografia}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Colores" icon="qr-code" hint="Paleta de tu marca. Se aplican a la landing en tiempo real.">
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Primario"   value={draft.color_primario   ?? ''} onChange={(v) => set('color_primario', v)}   error={errors.color_primario}   />
              <ColorField label="Secundario" value={draft.color_secundario ?? ''} onChange={(v) => set('color_secundario', v)} error={errors.color_secundario} />
              <ColorField label="Fondo"      value={draft.color_fondo      ?? ''} onChange={(v) => set('color_fondo', v)}      error={errors.color_fondo}      />
            </div>

            {/* Paletas sugeridas */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted mb-2">Paletas sugeridas</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_PALETTES.map((p) => {
                  const active =
                    (draft.color_primario   ?? '').toLowerCase() === p.primario.toLowerCase()
                    && (draft.color_secundario ?? '').toLowerCase() === p.secundario.toLowerCase()
                    && (draft.color_fondo      ?? '').toLowerCase() === p.fondo.toLowerCase();
                  return (
                    <button
                      key={p.name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDraft((d) => ({ ...d, color_primario: p.primario, color_secundario: p.secundario, color_fondo: p.fondo }))}
                      className={cn(
                        'relative rounded-xl border-2 overflow-hidden text-left transition',
                        active
                          ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-soft'
                          : 'border-line hover:border-ink/40',
                      )}
                    >
                      {active && (
                        <span className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-emerald-500 grid place-items-center text-white shadow">
                          <Icon name="check" size={11} />
                        </span>
                      )}
                      <div className="flex h-8">
                        <span className="flex-1" style={{ background: p.primario }} />
                        <span className="flex-1" style={{ background: p.secundario }} />
                        <span className="flex-1" style={{ background: p.fondo }} />
                      </div>
                      <p className={cn('text-[11px] font-semibold p-2 text-center', active && 'bg-emerald-50/60 text-emerald-900')}>{p.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Switch
              label="Dark mode"
              hint="Activa el tema oscuro en la landing"
              checked={!!draft.dark_mode}
              onChange={(v) => set('dark_mode', v)}
            />

            {/* Colores por elemento — opt-in, hereda del primario/secundario si no se setea */}
            <GranularColors
              value={draft.color_overrides ?? null}
              fallback={{
                boton_primario:   draft.color_primario   ?? '#FF2D2D',
                boton_secundario: draft.color_secundario ?? '#0B0B0F',
                badge_oferta:     '#DC2626',
                precio:           draft.color_primario   ?? '#FF2D2D',
                header_bg:        draft.color_primario   ?? '#FF2D2D',
                header_text:      '#FFFFFF',
              }}
              onChange={(v) => set('color_overrides', v as any)}
            />
          </Section>

          <Section title="Tipografía" icon="sparkles" hint="La fuente del nombre de tu local y los títulos. Elige una que vaya con tu marca.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FONT_OPTIONS.map((f) => {
                const active = draft.tipografia === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set('tipografia', f.value)}
                    className={cn(
                      'relative rounded-xl border-2 p-3 text-left transition',
                      active
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200 shadow-soft'
                        : 'border-line bg-white hover:border-ink/30',
                    )}
                  >
                    {active && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 grid place-items-center text-white shadow">
                        <Icon name="check" size={11} />
                      </span>
                    )}
                    <span
                      className="block text-xl leading-none mb-1"
                      style={{ fontFamily: f.css }}
                    >
                      Aa
                    </span>
                    <span className={cn('text-[11px] font-semibold', active ? 'text-emerald-900' : 'text-ink/80')}>{f.label}</span>
                    <span className="block text-[10px] text-muted">{f.category}</span>
                  </button>
                );
              })}
            </div>
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

          {/* Programa de lealtad — opcional */}
          <Section title="Programa de lealtad" icon="sparkles" hint="Tus clientes acumulan sellos al hacer pedidos con su email. Al completar la meta, ganan un premio que tú entregas en el local.">
            <Switch
              label="Activar programa de sellos"
              hint="Aparecerá en tu landing cuando el cliente escriba su email"
              checked={!!draft.lealtad_activo}
              onChange={(v) => set('lealtad_activo', v)}
            />
            {draft.lealtad_activo && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Cuántos sellos para un premio"
                    type="number"
                    min={3}
                    max={50}
                    value={draft.lealtad_meta ?? 10}
                    onChange={(e) => set('lealtad_meta', Math.max(3, Math.min(50, Number(e.target.value) || 10)))}
                    hint="Típicamente entre 5 y 12"
                  />
                  <Field
                    label="Qué premio das"
                    value={draft.lealtad_premio ?? ''}
                    onChange={(e) => set('lealtad_premio', e.target.value)}
                    maxLength={120}
                    hint="Ej. Café gratis · Postre del mes · 20% descuento"
                  />
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
                  <Icon name="sparkles" size={14} className="shrink-0 mt-0.5" />
                  <span><strong>Cómo funciona:</strong> Cada pedido con email suma 1 sello automáticamente. Cuando el cliente complete los {draft.lealtad_meta ?? 10} sellos, tu sistema le avisa y tú le das {draft.lealtad_premio || 'el premio'} en su próxima visita.</span>
                </div>
              </div>
            )}
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
              {/* HERO con banner — image-sequence scrubbing sutil: ken-burns suave
                  + parallax controlado por hover. Convierte la preview estática en
                  algo "vivo". */}
              <div className="relative h-44 overflow-hidden group">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[3000ms] ease-out group-hover:scale-110"
                  style={{
                    backgroundImage: draft.banner_url ? `url(${draft.banner_url})` : undefined,
                    background: !draft.banner_url ? 'linear-gradient(135deg, #ddd, #f3f3ee)' : undefined,
                    animation: draft.banner_url ? 'ce-kenburns 12s ease-in-out infinite alternate' : undefined,
                  }}
                />
                {/* Gradient overlay sutil sólo abajo para legibilidad del nombre */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
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
              className="mt-3 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 transition tap-target"
            >
              <Icon name="arrow-up-right" size={14} />
              Ver landing de mi local
            </a>
            <a
              href={(process.env.NEXT_PUBLIC_APP_URL ?? 'https://clicktoeat.lumiaaisolutions.com') + '/'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-2xl border border-line bg-white text-sm font-semibold text-ink hover:border-ink/40 transition tap-target"
            >
              <Icon name="home" size={14} />
              Volver al landing principal de ClickToEat
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full h-14 rounded-xl border-2 border-line hover:border-ink/40 transition cursor-pointer relative overflow-hidden group"
        style={{ backgroundColor: value || '#000000' }}
        aria-label={`Elegir color ${label}`}
      >
        <span className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/20 transition">
          <span className="opacity-0 group-hover:opacity-100 transition text-white text-xs font-semibold drop-shadow flex items-center gap-1.5">
            <Icon name="palette" size={14} />
            Cambiar color
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
}

/* ─────────── Catálogo de fuentes (loaded en layout.tsx) ─────────── */
// F100: catálogo curado para que sean VISIBLEMENTE distintas entre sí.
// Cada una tiene una personalidad clara (script, slab, display, etc).
const FONT_OPTIONS = [
  { value: 'Bricolage Grotesque', label: 'Bricolage',     category: 'Moderna',         css: '"Bricolage Grotesque", system-ui, sans-serif' },
  { value: 'Playfair Display',    label: 'Playfair',      category: 'Editorial clásica', css: '"Playfair Display", Georgia, serif' },
  { value: 'Pacifico',            label: 'Pacifico',      category: 'Script casual',   css: '"Pacifico", cursive' },
  { value: 'Abril Fatface',       label: 'Abril Fatface', category: 'Display retro',   css: '"Abril Fatface", Georgia, serif' },
  { value: 'Anton',               label: 'Anton',         category: 'Impact alto',     css: 'Anton, "Arial Narrow", sans-serif' },
  { value: 'Lora',                label: 'Lora',          category: 'Cálida humanista', css: 'Lora, Georgia, serif' },
  { value: 'Space Mono',          label: 'Space Mono',    category: 'Monospace tech',  css: '"Space Mono", "Courier New", monospace' },
  { value: 'Lobster',             label: 'Lobster',       category: 'Script bold',     css: 'Lobster, cursive' },
  { value: 'Bebas Neue',          label: 'Bebas Neue',    category: 'Condensed mayús', css: '"Bebas Neue", Impact, sans-serif' },
  { value: 'Caveat',              label: 'Caveat',        category: 'Handwriting',     css: 'Caveat, cursive' },
  { value: 'DM Serif Display',    label: 'DM Serif',      category: 'Display lujoso',  css: '"DM Serif Display", Georgia, serif' },
  { value: 'Roboto Slab',         label: 'Roboto Slab',   category: 'Slab moderno',    css: '"Roboto Slab", Georgia, serif' },
] as const;

/* ─────────── Paletas de color sugeridas ─────────── */
const COLOR_PALETTES = [
  { name: 'ClickToEat',  primario: '#FF2D2D', secundario: '#0B0B0F', fondo: '#FAFAF7' },
  { name: 'Postres',     primario: '#E91E8C', secundario: '#5B1233', fondo: '#FFF7FB' },
  { name: 'Italiana',    primario: '#16A34A', secundario: '#14532D', fondo: '#F0FDF4' },
  { name: 'Cafetería',   primario: '#92400E', secundario: '#3F2C0F', fondo: '#FEF7E9' },
  { name: 'Sushi',       primario: '#0B0B0F', secundario: '#DC2626', fondo: '#FFFFFF' },
  { name: 'Vegana',      primario: '#65A30D', secundario: '#3F6212', fondo: '#F7FEE7' },
  { name: 'Bar / Bebidas', primario: '#1E3A8A', secundario: '#0F172A', fondo: '#F0F4FF' },
  { name: 'Pastelería',  primario: '#D97706', secundario: '#7C2D12', fondo: '#FFFBEB' },
];

/* ─────────── Colores granulares (opt-in) ─────────── */
const GRANULAR_KEYS = [
  { key: 'boton_primario',   label: 'Botón primario',   hint: 'CTA "Pedir por WhatsApp"' },
  { key: 'boton_secundario', label: 'Botón secundario', hint: 'Acciones suaves' },
  { key: 'badge_oferta',     label: 'Badge oferta',     hint: 'Etiqueta -30%, 2x1, etc.' },
  { key: 'precio',           label: 'Precio',           hint: 'Color del monto en productos' },
  { key: 'header_bg',        label: 'Fondo del header', hint: 'Fondo del nombre del local' },
  { key: 'header_text',      label: 'Texto del header', hint: 'Texto sobre el header' },
] as const;

type GranularKey = (typeof GRANULAR_KEYS)[number]['key'];
type GranularValue = Partial<Record<GranularKey, string | null>>;

function GranularColors({
  value,
  fallback,
  onChange,
}: {
  value: GranularValue | null;
  fallback: Record<GranularKey, string>;
  onChange: (v: GranularValue | null) => void;
}) {
  const enabled = value !== null && value !== undefined;
  const [open, setOpen] = useState(enabled);

  return (
    <div className="mt-4 rounded-2xl border border-line bg-line/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-line/30 transition"
      >
        <div className="flex items-center gap-2">
          <Icon name="palette" size={14} className="text-ink/60" />
          <span className="text-sm font-semibold">Colores avanzados por elemento</span>
          {enabled && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">activo</span>}
        </div>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} className="text-ink/50" />
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-line bg-white">
          <p className="text-xs text-muted">
            Por defecto, todo hereda de Primario/Secundario. Activa "Personalizar" para sobreescribir un elemento puntual.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GRANULAR_KEYS.map(({ key, label, hint }) => {
              const overridden = value?.[key] != null && value?.[key] !== '';
              const current = overridden ? (value?.[key] ?? '') : fallback[key];
              return (
                <div key={key} className="rounded-xl border border-line p-3 bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold">{label}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const next: GranularValue = { ...(value ?? {}) };
                        if (overridden) {
                          delete next[key];
                          onChange(Object.keys(next).length ? next : null);
                        } else {
                          next[key] = fallback[key];
                          onChange(next);
                        }
                      }}
                      className={cn(
                        'text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full transition',
                        overridden ? 'bg-ink text-white' : 'bg-line/40 text-ink/60 hover:bg-line/60',
                      )}
                    >
                      {overridden ? 'Personalizado' : 'Heredado'}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted mb-2">{hint}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={current || '#000000'}
                      onChange={(e) => {
                        const next: GranularValue = { ...(value ?? {}) };
                        next[key] = e.target.value.toUpperCase();
                        onChange(next);
                      }}
                      disabled={!overridden}
                      className="h-9 w-12 rounded-lg border border-line cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={current}
                      onChange={(e) => {
                        const next: GranularValue = { ...(value ?? {}) };
                        next[key] = e.target.value;
                        onChange(next);
                      }}
                      disabled={!overridden}
                      maxLength={9}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-line font-mono text-xs bg-white disabled:bg-line/30 disabled:text-muted"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {enabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
            >
              <Icon name="x" size={12} /> Reiniciar todos los overrides
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────── Plantillas de landing — paleta + tipografía + overrides ─────────── */
const LANDING_TEMPLATES = [
  {
    id: 'mex-callejero',
    name: 'Cocina Mexicana',
    primario: '#FF2D2D', secundario: '#0B0B0F', fondo: '#FAFAF7',
    tipografia: 'Bricolage Grotesque',
    overrides: { badge_oferta: '#16A34A' },
  },
  {
    id: 'italiana',
    name: 'Pizzería Italiana',
    primario: '#16A34A', secundario: '#7C2D12', fondo: '#FFF8EC',
    tipografia: 'Playfair Display',
    overrides: { boton_primario: '#C2410C', precio: '#7C2D12' },
  },
  {
    id: 'cafeteria',
    name: 'Cafetería Boutique',
    primario: '#92400E', secundario: '#3F2C0F', fondo: '#FEF7E9',
    tipografia: 'Cormorant Garamond',
    overrides: null,
  },
  {
    id: 'sushi-minimal',
    name: 'Sushi Minimal',
    primario: '#0B0B0F', secundario: '#DC2626', fondo: '#FFFFFF',
    tipografia: 'Inter',
    overrides: { boton_primario: '#DC2626', badge_oferta: '#DC2626' },
  },
  {
    id: 'postres',
    name: 'Postres y Dulces',
    primario: '#E91E8C', secundario: '#5B1233', fondo: '#FFF7FB',
    tipografia: 'DM Serif Display',
    overrides: null,
  },
  {
    id: 'bar',
    name: 'Bar / Coctelería',
    primario: '#1E3A8A', secundario: '#0F172A', fondo: '#F0F4FF',
    tipografia: 'Space Grotesk',
    overrides: { boton_primario: '#DAA520', badge_oferta: '#DAA520' },
  },
  {
    id: 'vegan',
    name: 'Healthy / Vegano',
    primario: '#65A30D', secundario: '#3F6212', fondo: '#F7FEE7',
    tipografia: 'Manrope',
    overrides: null,
  },
  {
    id: 'pasteleria',
    name: 'Pastelería Clásica',
    primario: '#D97706', secundario: '#7C2D12', fondo: '#FFFBEB',
    tipografia: 'Fraunces',
    overrides: { precio: '#7C2D12' },
  },
] as const;
