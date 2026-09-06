'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Logo } from '@/components/ui/Logo';
import { AuthShell } from '@/components/auth/AuthShell';

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
    <AuthShell>
      <form onSubmit={onSubmit} className="w-full max-w-sm mx-auto lg:mx-0">
        <div className="mb-4 flex justify-center lg:justify-start">
          <Logo variant="lockup" size={44} />
        </div>
        <h1 className="ce-display text-2xl font-bold text-center lg:text-left">Entrar al panel</h1>
        <p className="text-sm text-muted text-center lg:text-left mb-6">Administración del local</p>

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
          className="w-full py-3 rounded-2xl text-white font-semibold shadow-lg shadow-[#F26A1F]/30 bg-gradient-to-r from-[#F26A1F] to-[#FF8A47] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-40"
        >
          {loading ? 'Entrando…' : needs2fa ? 'Verificar y entrar' : 'Entrar'}
        </button>

        <a
          href="/forgot-password"
          className="block text-center lg:text-left text-sm text-muted mt-4 hover:text-ink"
        >
          ¿Olvidaste tu contraseña?
        </a>

        <p className="text-sm text-muted mt-6 text-center lg:text-left">
          ¿No tienes cuenta?{' '}
          <a href="/registro" className="font-semibold text-[#F26A1F] hover:underline">Crea tu local</a>
        </p>
      </form>
    </AuthShell>
  );
}
