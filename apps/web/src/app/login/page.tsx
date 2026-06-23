'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Icon } from '@/components/ui/Icon';

export default function LoginPage() {
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await login(email, password, needs2fa ? otp : undefined);
      if (res.twoFactorRequired) {
        setNeeds2fa(true);
        return;
      }
      router.push('/admin');
    } catch (err: any) {
      const otpErr = err?.response?.data?.errors?.otp?.[0];
      if (otpErr) {
        setNeeds2fa(true);
        setError(otpErr);
      } else {
        setError(err?.response?.data?.errors?.email?.[0] ?? 'No pudimos iniciar sesión.');
      }
    }
  };

  return (
    <main className="min-h-screen grid place-items-center px-6 py-10 relative">
      {/* Volver al inicio */}
      <Link
        href="/"
        className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition px-3 py-1.5 rounded-lg hover:bg-line/40"
      >
        <Icon name="arrow-right" size={14} className="rotate-180" />
        Volver al inicio
      </Link>

      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-3xl border border-line shadow-soft p-6">
        <div className="mb-4 flex justify-center">
          <Image
            src="/logo.png"
            alt="ClickToEat"
            width={144}
            height={130}
            priority
            className="h-20 w-auto select-none"
          />
        </div>
        <h1 className="ce-display text-xl font-bold text-center">Entrar al panel</h1>
        <p className="text-sm text-muted text-center mb-6">Administración del local</p>

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 border border-line rounded-xl"
        />

        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-line rounded-xl"
        />

        {needs2fa && (
          <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50">
            <label className="block text-sm font-semibold mb-1">Código de 2 pasos</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9A-Za-z-]/g, '').toUpperCase())}
              placeholder="Ingresa los 6 dígitos de tu app"
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white tracking-widest text-center font-mono"
              maxLength={11}
            />
            <p className="text-[11px] text-amber-700 mt-1.5">
              Abre Google Authenticator / 1Password y escribe el código actual. También aceptamos códigos de recuperación.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-ink text-white font-medium disabled:opacity-40"
        >
          {loading ? 'Entrando…' : needs2fa ? 'Verificar y entrar' : 'Entrar'}
        </button>

        <a
          href="/forgot-password"
          className="block text-center text-sm text-muted mt-4 hover:text-ink"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </form>

      {/* Footer LUMIA */}
      <p className="absolute bottom-5 inset-x-0 text-center text-xs text-muted">
        Desarrollado por{' '}
        <a
          href="https://lumiaaisolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ink/70 hover:text-ink underline-offset-2 hover:underline"
        >
          LUMIA
        </a>
      </p>
    </main>
  );
}
