'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/store/auth';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

const STEPS = ['password', 'local', 'branding', 'contacto', 'finalizar'] as const;
type StepName = typeof STEPS[number];

const STEP_TITLE: Record<StepName, string> = {
  password:  'Tu cuenta',
  local:     'Tu local',
  branding:  'Tu identidad',
  contacto:  'Cómo te contactan',
  finalizar: '¡Listo!',
};

const STEP_SUBTITLE: Record<StepName, string> = {
  password:  'Crea tu acceso al panel.',
  local:     'Nombre, URL pública y descripción.',
  branding:  'Logo y colores. Puedes cambiarlo después.',
  contacto:  'WhatsApp, dirección y horarios.',
  finalizar: 'Ya puedes entrar al panel.',
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
        // 202 → el webhook aún no procesó. Reintentamos 2s.
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
  const isLast = stepIdx === STEPS.length - 1;

  async function submit(payload: Record<string, any>) {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const url = step === 'finalizar'
        ? `${apiBase}/onboarding/finalizar`
        : `${apiBase}/onboarding/${step}`;
      const res = await axios.post<any>(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (step === 'finalizar') {
        await setTokenAndHydrate(res.data.token);
        router.replace('/admin');
        return;
      }
      setStepIdx((i) => i + 1);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Algo falló. Revisa los datos.');
    } finally {
      setLoading(false);
    }
  }

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

        <div className="mt-8">
          <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
            <span className="w-6 h-px bg-ink/40" />
            Paso {stepIdx + 1} de {STEPS.length}
          </p>
          <h1 className="ce-display mt-2 text-3xl sm:text-4xl font-bold">{STEP_TITLE[step]}</h1>
          <p className="mt-1 text-sm text-muted">{STEP_SUBTITLE[step]}</p>
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
            {step === 'password'  && <PasswordStep  loading={loading} onSubmit={submit} />}
            {step === 'local'     && <LocalStep     loading={loading} onSubmit={submit} />}
            {step === 'branding'  && <BrandingStep  loading={loading} onSubmit={submit} onSkip={() => setStepIdx((i) => i + 1)} token={token} />}
            {step === 'contacto'  && <ContactoStep  loading={loading} onSubmit={submit} />}
            {step === 'finalizar' && <FinalizarStep loading={loading} onSubmit={submit} />}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}

/* ─── Subcomponentes de cada paso ─── */

function PasswordStep({ loading, onSubmit }: { loading: boolean; onSubmit: (p: any) => void }) {
  const [nombre,   setNombre]   = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ nombre, email, password, password_confirmation: confirm });
      }}
    >
      <Field label="Nombre">
        <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
      </Field>
      <Field label="Correo">
        <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </Field>
      <Field label="Contraseña">
        <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
      </Field>
      <Field label="Confirmar contraseña">
        <input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" />
      </Field>
      <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
    </form>
  );
}

function LocalStep({ loading, onSubmit }: { loading: boolean; onSubmit: (p: any) => void }) {
  const [nombre,  setNombre]  = useState('');
  const [slug,    setSlug]    = useState('');
  const [tagline, setTagline] = useState('');
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ nombre, slug, tagline: tagline || null }); }}>
      <Field label="Nombre del local">
        <input className={inputCls} value={nombre} onChange={(e) => { setNombre(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} required />
      </Field>
      <Field label="URL pública (slug)" hint={`tudominio.com/${slug || 'tu-local'}`}>
        <input className={inputCls} value={slug} onChange={(e) => setSlug(slugify(e.target.value))} pattern="[a-z0-9-]+" required />
      </Field>
      <Field label="Eslogan (opcional)" hint="Una frase corta que aparece debajo del nombre de tu local">
        <input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} />
      </Field>
      <SubmitButton loading={loading}>Guardar</SubmitButton>
    </form>
  );
}

function BrandingStep({ loading, onSubmit, onSkip, token }: { loading: boolean; onSubmit: (p: any) => void; onSkip: () => void; token: string | null }) {
  const [primario, setPrimario] = useState('#FF2D2D');
  const [logo,     setLogo]     = useState('');
  const [banner,   setBanner]   = useState('');
  return (
    <form className="space-y-5" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        color_primario: primario,
        logo_url:   logo   || null,
        banner_url: banner || null,
      });
    }}>
      <Field label="Color principal de tu marca" hint="Aparece en botones, badges y acentos de tu landing.">
        <div className="flex items-center gap-3">
          <input type="color" className="h-12 w-16 rounded-2xl border border-line cursor-pointer" value={primario} onChange={(e) => setPrimario(e.target.value)} />
          <input type="text" className={inputCls + ' flex-1'} value={primario} onChange={(e) => setPrimario(e.target.value)} maxLength={7} />
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Logo (opcional)" hint="JPG/PNG/WebP, máx 5 MB. Aparece grande en tu hero.">
          <OnboardingUploader token={token} folder="logos" value={logo} onChange={setLogo} placeholder="Sube tu logo" />
        </Field>
        <Field label="Banner (opcional)" hint="Foto de fondo del hero. JPG/PNG/WebP, máx 5 MB.">
          <OnboardingUploader token={token} folder="banners" value={banner} onChange={setBanner} placeholder="Sube tu banner" />
        </Field>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onSkip} className="px-5 py-3 rounded-2xl border border-line text-sm font-medium hover:border-ink/30">Saltar</button>
        <SubmitButton loading={loading}>Guardar</SubmitButton>
      </div>
    </form>
  );
}

/**
 * Upload con switch "Subir / Pegar URL". Usa el endpoint /api/v1/onboarding/upload
 * autenticado por el bearer onboarding_token (sin Sanctum aún).
 */
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

function ContactoStep({ loading, onSubmit }: { loading: boolean; onSubmit: (p: any) => void }) {
  const [whatsapp,  setWhatsapp]  = useState('52');
  const [direccion, setDireccion] = useState('');
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ whatsapp, direccion: direccion || null });
    }}>
      <Field label="WhatsApp" hint="Solo dígitos con código de país. Ej: 5215512345678">
        <input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} required minLength={8} maxLength={16} inputMode="numeric" />
      </Field>
      <Field label="Dirección (opcional)">
        <input className={inputCls} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
      </Field>
      <SubmitButton loading={loading}>Guardar</SubmitButton>
    </form>
  );
}

function FinalizarStep({ loading, onSubmit }: { loading: boolean; onSubmit: (p: any) => void }) {
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
        onClick={() => onSubmit({})}
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 tap-target"
      >
        {loading ? (<><Icon name="compass" size={16} className="animate-spin" /> Abriendo…</>) : (<>Entrar al panel <Icon name="arrow-right" size={16} /></>)}
      </button>
    </div>
  );
}

/* ─── Atomos ─── */

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

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
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
