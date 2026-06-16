'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/store/auth';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

const LocationPicker = dynamic(() => import('@/components/admin/LocationPicker').then((m) => m.LocationPicker), { ssr: false });

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
const frontendBase = (process.env.NEXT_PUBLIC_FRONTEND_URL ?? (typeof window !== 'undefined' ? window.location.origin : ''))
  .replace(/\/$/, '');

const STEPS = ['password', 'local', 'branding', 'contacto', 'resumen', 'finalizar'] as const;
type StepName = typeof STEPS[number];

const STEP_TITLE: Record<StepName, string> = {
  password:  'Tu cuenta',
  local:     'Tu local',
  branding:  'Tu identidad',
  contacto:  'Cómo te contactan',
  resumen:   'Revisa todo',
  finalizar: '¡Listo!',
};

const STEP_SUBTITLE: Record<StepName, string> = {
  password:  'Crea tu acceso al panel.',
  local:     'Ponle nombre a tu local.',
  branding:  'Logo y colores. Puedes cambiarlo después.',
  contacto:  'WhatsApp y ubicación.',
  resumen:   'Asegúrate que todo esté bien antes de entrar.',
  finalizar: 'Ya puedes entrar al panel.',
};

// Estado completo del onboarding — se eleva al parent para que el resumen
// y los botones de "atrás" puedan ver los datos de pasos anteriores.
interface OnboardingData {
  password: { nombre: string; email: string; password: string };
  local:    { nombre: string; slug: string; tagline: string };
  branding: { color_primario: string; logo_url: string; banner_url: string };
  contacto: { whatsapp: string; direccion: string; lat: number | null; lng: number | null };
}

const emptyData: OnboardingData = {
  password: { nombre: '', email: '', password: '' },
  local:    { nombre: '', slug: '', tagline: '' },
  branding: { color_primario: '#FF2D2D', logo_url: '', banner_url: '' },
  contacto: { whatsapp: '52', direccion: '', lat: null, lng: null },
};

export function OnboardingClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const setTokenAndHydrate = useAuth((s) => s.setTokenAndHydrate);

  const sessionId = sp.get('session_id');

  const [token,   setToken]   = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(true);
  const [data,    setData]    = useState<OnboardingData>(emptyData);

  // 1) Cambiar `session_id` por un `onboarding_token` apenas montemos.
  useEffect(() => {
    if (!sessionId) {
      setError('Falta el parámetro session_id. Vuelve a la página de planes.');
      setExchanging(false);
      return;
    }

    let cancelled = false;
    const pollOnce = async () => {
      try {
        const res = await axios.get<{ onboarding_token: string }>(
          `${apiBase}/billing/session/${encodeURIComponent(sessionId)}`,
        );
        if (cancelled) return;
        setToken(res.data.onboarding_token);
        setExchanging(false);
      } catch (e: any) {
        if (cancelled) return;
        if (e.response?.status === 202) {
          setTimeout(pollOnce, 2000);
          return;
        }
        setError(e.response?.data?.message ?? 'No pudimos validar tu pago.');
        setExchanging(false);
      }
    };
    pollOnce();
    return () => { cancelled = true; };
  }, [sessionId]);

  const step = STEPS[stepIdx];

  const updateData = <K extends keyof OnboardingData>(key: K, patch: Partial<OnboardingData[K]>) => {
    setData((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  };

  /**
   * Avanza al siguiente paso. Si el paso tiene un endpoint backend, lo llama
   * primero. Los pasos `resumen` y `finalizar` se manejan distinto.
   */
  async function nextStep(): Promise<void> {
    if (!token) return;

    // Pasos sin backend call: solo navegar
    if (step === 'resumen') {
      setStepIdx((i) => i + 1);
      return;
    }
    if (step === 'finalizar') {
      // ya se manejó en FinalizarStep
      return;
    }

    setLoading(true); setError(null);
    try {
      const payload = buildPayloadForStep(step, data);
      await axios.post(`${apiBase}/onboarding/${step}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStepIdx((i) => i + 1);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Algo falló. Revisa los datos.');
    } finally {
      setLoading(false);
    }
  }

  async function finalize(): Promise<void> {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await axios.post<{ token: string }>(
        `${apiBase}/onboarding/finalizar`, {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await setTokenAndHydrate(res.data.token);
      router.replace('/admin');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'No pudimos finalizar.');
      setLoading(false);
    }
  }

  const goBack = () => { setError(null); setStepIdx((i) => Math.max(0, i - 1)); };
  const jumpToStep = (target: StepName) => {
    const idx = STEPS.indexOf(target);
    if (idx >= 0) { setError(null); setStepIdx(idx); }
  };

  if (exchanging) {
    return <Centered title="Confirmando pago…" body="Esto toma un par de segundos." spinner />;
  }
  if (error && !token) {
    return <Centered title="Algo no salió bien" body={error} cta={{ href: '/', label: 'Volver a planes' }} />;
  }

  return (
    <main className="min-h-screen bg-[color:var(--ce-bg)]">
      <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <Logo variant="lockup" size={28} />
      </header>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <ProgressBar stepIdx={stepIdx} total={STEPS.length} />

        <div className="mt-8 flex items-start gap-3 flex-wrap">
          {stepIdx > 0 && step !== 'finalizar' && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-white hover:border-ink/30 text-xs font-semibold text-ink/80 hover:text-ink transition"
            >
              <Icon name="chevron-right" size={12} className="rotate-180" />
              Atrás
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
              <span className="w-6 h-px bg-ink/40" />
              Paso {stepIdx + 1} de {STEPS.length}
            </p>
            <h1 className="ce-display mt-2 text-3xl sm:text-4xl font-bold">{STEP_TITLE[step]}</h1>
            <p className="mt-1 text-sm text-muted">{STEP_SUBTITLE[step]}</p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            {step === 'password'  && <PasswordStep  data={data.password} onChange={(p) => updateData('password', p)} onSubmit={nextStep} loading={loading} />}
            {step === 'local'     && <LocalStep     data={data.local}    onChange={(p) => updateData('local', p)}    onSubmit={nextStep} loading={loading} />}
            {step === 'branding'  && <BrandingStep  data={data.branding} onChange={(p) => updateData('branding', p)} onSubmit={nextStep} onSkip={() => setStepIdx((i) => i + 1)} loading={loading} token={token} />}
            {step === 'contacto'  && <ContactoStep  data={data.contacto} onChange={(p) => updateData('contacto', p)} onSubmit={nextStep} loading={loading} />}
            {step === 'resumen'   && <ResumenStep   data={data} onEdit={jumpToStep} onConfirm={nextStep} loading={loading} />}
            {step === 'finalizar' && <FinalizarStep loading={loading} onSubmit={finalize} />}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}

/* ─────────────── Helpers de payload ─────────────── */

function buildPayloadForStep(step: StepName, d: OnboardingData): Record<string, any> {
  switch (step) {
    case 'password':
      return {
        nombre: d.password.nombre,
        email:  d.password.email,
        password: d.password.password,
        password_confirmation: d.password.password,
      };
    case 'local':
      return {
        nombre:  d.local.nombre,
        slug:    d.local.slug || slugify(d.local.nombre),
        tagline: d.local.tagline || null,
      };
    case 'branding':
      return {
        color_primario: d.branding.color_primario,
        logo_url:   d.branding.logo_url   || null,
        banner_url: d.branding.banner_url || null,
      };
    case 'contacto':
      return {
        whatsapp:  d.contacto.whatsapp,
        direccion: d.contacto.direccion || null,
        lat: d.contacto.lat,
        lng: d.contacto.lng,
      };
    default:
      return {};
  }
}

/* ─────────────── Step 1: Tu cuenta ─────────────── */

function PasswordStep({ data, onChange, onSubmit, loading }: {
  data: OnboardingData['password']; onChange: (p: Partial<OnboardingData['password']>) => void; onSubmit: () => void; loading: boolean;
}) {
  const [confirm, setConfirm] = useState(data.password);
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (data.password !== confirm) { setLocalError('Las contraseñas no coinciden'); return; }
        setLocalError(null);
        onSubmit();
      }}
    >
      <Field label="Nombre">
        <input className={inputCls} value={data.nombre} onChange={(e) => onChange({ nombre: e.target.value })} required autoComplete="name" />
      </Field>
      <Field label="Correo">
        <input type="email" className={inputCls} value={data.email} onChange={(e) => onChange({ email: e.target.value })} required autoComplete="email" />
      </Field>
      <Field label="Contraseña">
        <input type="password" className={inputCls} value={data.password} onChange={(e) => onChange({ password: e.target.value })} minLength={8} required autoComplete="new-password" />
      </Field>
      <Field label="Confirmar contraseña">
        <input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" />
      </Field>
      {localError && <p className="text-xs text-red-600">{localError}</p>}
      <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
    </form>
  );
}

/* ─────────────── Step 2: Tu local — slug auto ─────────────── */

function LocalStep({ data, onChange, onSubmit, loading }: {
  data: OnboardingData['local']; onChange: (p: Partial<OnboardingData['local']>) => void; onSubmit: () => void; loading: boolean;
}) {
  // El slug se calcula del nombre automáticamente. No es editable.
  const autoSlug = slugify(data.nombre);
  const effectiveSlug = data.slug && data.slug.length >= 3 ? data.slug : autoSlug;

  // Cuando cambia el nombre, sincronizamos el slug si el user no lo ha modificado.
  const onNombreChange = (v: string) => {
    onChange({ nombre: v, slug: slugify(v) });
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <Field label="Nombre del local">
        <input className={inputCls} value={data.nombre} onChange={(e) => onNombreChange(e.target.value)} required maxLength={120} placeholder="Ej. Tacos El Gordo" />
      </Field>

      {/* URL solo lectura — se genera del nombre */}
      {effectiveSlug && (
        <div className="rounded-2xl border border-line bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">URL</p>
          <p className="font-mono text-sm break-all">
            <span className="text-muted">{frontendBase.replace(/^https?:\/\//, '')}/</span>
            <span className="text-ink font-semibold">{effectiveSlug}</span>
          </p>
          <p className="text-[11px] text-muted mt-1">Se crea automática a partir del nombre.</p>
        </div>
      )}

      <Field label="Eslogan (opcional)" hint="Una frase corta debajo del nombre del local">
        <input className={inputCls} value={data.tagline} onChange={(e) => onChange({ tagline: e.target.value })} maxLength={160} placeholder="Ej. Los mejores al pastor de la zona" />
      </Field>

      <SubmitButton loading={loading} disabled={!data.nombre.trim() || effectiveSlug.length < 3}>Continuar</SubmitButton>
    </form>
  );
}

/* ─────────────── Step 3: Tu identidad ─────────────── */

const PALETAS = [
  { name: 'ClickToEat', primario: '#FF2D2D' },
  { name: 'Postres',    primario: '#EC4899' },
  { name: 'Italiana',   primario: '#15803D' },
  { name: 'Cafetería',  primario: '#92400E' },
  { name: 'Sushi',      primario: '#0F172A' },
  { name: 'Vegana',     primario: '#65A30D' },
  { name: 'Bar',        primario: '#1E3A8A' },
  { name: 'Pastelería', primario: '#B45309' },
];

function BrandingStep({ data, onChange, onSubmit, onSkip, loading, token }: {
  data: OnboardingData['branding']; onChange: (p: Partial<OnboardingData['branding']>) => void; onSubmit: () => void; onSkip: () => void; loading: boolean; token: string | null;
}) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <Field label="Color principal" hint="Aparece en botones, badges y acentos de tu landing.">
        {/* Paletas pre-hechas */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
          {PALETAS.map((p) => {
            const active = data.color_primario.toLowerCase() === p.primario.toLowerCase();
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onChange({ color_primario: p.primario })}
                aria-pressed={active}
                className={cn(
                  'relative h-14 rounded-xl border-2 transition overflow-hidden',
                  active ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-line hover:border-ink/30',
                )}
                style={{ backgroundColor: p.primario }}
                title={p.name}
              >
                {active && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 grid place-items-center text-white shadow">
                    <Icon name="check" size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Color personalizado — solo botón, sin código hex visible */}
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="w-full h-14 rounded-xl border-2 border-line hover:border-ink/40 transition cursor-pointer relative overflow-hidden group"
          style={{ backgroundColor: data.color_primario }}
        >
          <span className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/20 transition">
            <span className="opacity-0 group-hover:opacity-100 transition text-white text-xs font-semibold drop-shadow flex items-center gap-1.5">
              <Icon name="palette" size={14} />
              Color personalizado
            </span>
          </span>
        </button>
        <input
          ref={colorInputRef}
          type="color"
          value={data.color_primario}
          onChange={(e) => onChange({ color_primario: e.target.value.toUpperCase() })}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Logo (opcional)" hint="JPG/PNG/WebP, máx 5 MB.">
          <OnboardingUploader token={token} folder="logos" value={data.logo_url} onChange={(v) => onChange({ logo_url: v })} placeholder="Sube tu logo" />
        </Field>
        <Field label="Banner (opcional)" hint="Foto de fondo del hero.">
          <OnboardingUploader token={token} folder="banners" value={data.banner_url} onChange={(v) => onChange({ banner_url: v })} placeholder="Sube tu banner" />
        </Field>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onSkip} className="px-5 py-3 rounded-2xl border border-line text-sm font-medium hover:border-ink/30">Saltar</button>
        <SubmitButton loading={loading}>Continuar</SubmitButton>
      </div>
    </form>
  );
}

/* ─────────────── Step 4: Cómo te contactan + mapa + geo ─────────────── */

function ContactoStep({ data, onChange, onSubmit, loading }: {
  data: OnboardingData['contacto']; onChange: (p: Partial<OnboardingData['contacto']>) => void; onSubmit: () => void; loading: boolean;
}) {
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <Field label="WhatsApp" hint="Solo dígitos con código de país. Ej: 5215512345678">
        <input
          className={inputCls}
          value={data.whatsapp}
          onChange={(e) => onChange({ whatsapp: e.target.value.replace(/\D/g, '') })}
          required minLength={8} maxLength={16} inputMode="numeric"
        />
      </Field>

      <div className="block">
        <span className="block text-sm font-medium mb-1.5">Ubicación del local</span>
        <LocationPicker
          value={{ direccion: data.direccion, lat: data.lat, lng: data.lng }}
          onChange={(v) => onChange({ direccion: v.direccion, lat: v.lat, lng: v.lng })}
        />
      </div>

      <SubmitButton loading={loading}>Continuar</SubmitButton>
    </form>
  );
}

/* ─────────────── Step 5: Resumen — el user revisa todo ─────────────── */

function ResumenStep({ data, onEdit, onConfirm, loading }: {
  data: OnboardingData;
  onEdit: (s: StepName) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const slug = data.local.slug || slugify(data.local.nombre);

  return (
    <div className="space-y-3">
      <ResumenCard title="Tu cuenta" onEdit={() => onEdit('password')}>
        <Row label="Nombre" value={data.password.nombre || '—'} />
        <Row label="Correo" value={data.password.email || '—'} />
      </ResumenCard>

      <ResumenCard title="Tu local" onEdit={() => onEdit('local')}>
        <Row label="Nombre" value={data.local.nombre || '—'} />
        <Row label="URL" value={`${frontendBase.replace(/^https?:\/\//, '')}/${slug}`} mono />
        {data.local.tagline && <Row label="Eslogan" value={data.local.tagline} />}
      </ResumenCard>

      <ResumenCard title="Tu identidad" onEdit={() => onEdit('branding')}>
        <div className="flex items-center gap-3 mb-2">
          <span
            className="inline-block w-10 h-10 rounded-lg border border-line"
            style={{ backgroundColor: data.branding.color_primario }}
          />
          <div>
            <p className="text-xs text-muted">Color principal</p>
            <p className="text-sm font-semibold">{namePalette(data.branding.color_primario)}</p>
          </div>
        </div>
        {data.branding.logo_url && (
          <Row label="Logo" value={<img src={data.branding.logo_url} alt="logo" className="w-12 h-12 rounded-lg object-cover border border-line" />} />
        )}
        {data.branding.banner_url && (
          <Row label="Banner" value={<img src={data.branding.banner_url} alt="banner" className="w-24 h-12 rounded-lg object-cover border border-line" />} />
        )}
      </ResumenCard>

      <ResumenCard title="Cómo te contactan" onEdit={() => onEdit('contacto')}>
        <Row label="WhatsApp" value={data.contacto.whatsapp || '—'} mono />
        <Row label="Dirección" value={data.contacto.direccion || 'Sin dirección'} />
        {(data.contacto.lat && data.contacto.lng) && (
          <Row label="Coordenadas" value={`${data.contacto.lat.toFixed(5)}, ${data.contacto.lng.toFixed(5)}`} mono />
        )}
      </ResumenCard>

      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 tap-target"
      >
        {loading
          ? <><Icon name="compass" size={16} className="animate-spin" /> Guardando…</>
          : <>Todo se ve bien, continuar <Icon name="arrow-right" size={16} /></>}
      </button>
    </div>
  );
}

function ResumenCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="ce-display font-bold text-base">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-ink/70 hover:text-ink underline">Editar</button>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted shrink-0">{label}</span>
      <span className={cn('text-right break-all', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function namePalette(hex: string): string {
  const found = PALETAS.find((p) => p.primario.toLowerCase() === hex.toLowerCase());
  return found?.name ?? 'Color personalizado';
}

/* ─────────────── Step 6: Finalizar ─────────────── */

function FinalizarStep({ loading, onSubmit }: { loading: boolean; onSubmit: () => void }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-100 grid place-items-center mx-auto">
        <Icon name="check" size={26} className="text-emerald-700" />
      </div>
      <h3 className="ce-display text-2xl font-bold mt-4">Todo listo</h3>
      <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
        Tu trial está activo. Vamos a abrir tu panel para que empieces a configurar tu menú.
      </p>
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 tap-target"
      >
        {loading ? (<><Icon name="compass" size={16} className="animate-spin" /> Abriendo…</>) : (<>Entrar al panel <Icon name="arrow-right" size={16} /></>)}
      </button>
    </div>
  );
}

/* ─────────────── Uploader (sin cambios) ─────────────── */

function OnboardingUploader({
  token, folder, value, onChange, placeholder,
}: {
  token: string | null;
  folder: 'logos' | 'banners';
  value: string;
  onChange: (url: string) => void;
  placeholder: string;
}) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!token) { setErr('Sesión expirada'); return; }
    if (file.size > 5 * 1024 * 1024) { setErr('Máx 5 MB.'); return; }
    setUploading(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('folder', folder);
      const res = await axios.post(`${apiBase}/onboarding/upload`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onChange(res.data?.data?.url ?? '');
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'No se pudo subir.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="inline-flex p-0.5 rounded-xl bg-line/40 mb-2 text-xs font-semibold">
        <button type="button" onClick={() => setMode('upload')} className={cn('px-3 py-1.5 rounded-lg transition', mode === 'upload' ? 'bg-white shadow-sm text-ink' : 'text-muted')}>Subir archivo</button>
        <button type="button" onClick={() => setMode('url')} className={cn('px-3 py-1.5 rounded-lg transition', mode === 'url' ? 'bg-white shadow-sm text-ink' : 'text-muted')}>Pegar URL</button>
      </div>

      {mode === 'upload' ? (
        <>
          {value ? (
            <div className="relative rounded-2xl border border-line overflow-hidden bg-line/20 aspect-square">
              <img src={value} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => onChange('')} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 grid place-items-center text-ink shadow hover:bg-white">
                <Icon name="x" size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-line bg-white hover:border-ink/40 transition grid place-items-center text-muted text-sm gap-1"
            >
              {uploading ? (
                <><Icon name="compass" size={20} className="animate-spin" /> <span>Subiendo…</span></>
              ) : (
                <><Icon name="download" size={20} className="rotate-180" /> <span>{placeholder}</span><span className="text-[10px] text-muted">o arrastra aquí</span></>
              )}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </>
      ) : (
        <input
          type="url"
          placeholder="https://…"
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {err && <p className="text-xs text-red-600 mt-1.5">{err}</p>}
    </div>
  );
}

/* ─────────────── Átomos ─────────────── */

const inputCls = 'w-full h-12 px-4 rounded-2xl border border-line bg-white text-base outline-none focus:border-ink/50 transition';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </label>
  );
}

function SubmitButton({ loading, children, disabled }: { loading: boolean; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 tap-target"
    >
      {loading ? (<><Icon name="compass" size={16} className="animate-spin" /> Guardando…</>) : (<>{children} <Icon name="arrow-right" size={16} /></>)}
    </button>
  );
}

function ProgressBar({ stepIdx, total }: { stepIdx: number; total: number }) {
  const pct = ((stepIdx + 1) / total) * 100;
  return (
    <div className="h-1 rounded-full bg-line overflow-hidden">
      <motion.div
        className="h-full bg-ink"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </div>
  );
}

function Centered({ title, body, spinner, cta }: { title: string; body: string; spinner?: boolean; cta?: { href: string; label: string } }) {
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="rounded-3xl border border-line bg-white p-10 text-center max-w-md">
        {spinner && <Icon name="compass" size={28} className="animate-spin mx-auto mb-3 text-muted" />}
        <h1 className="ce-display text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted mt-2">{body}</p>
        {cta && (
          <a href={cta.href} className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90">
            {cta.label}
            <Icon name="arrow-right" size={16} />
          </a>
        )}
      </div>
    </main>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
