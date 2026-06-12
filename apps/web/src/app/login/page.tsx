'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Logo } from '@/components/ui/Logo';

export default function LoginPage() {
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push('/admin');
    } catch (err: any) {
      setError(err?.response?.data?.errors?.email?.[0] ?? 'No pudimos iniciar sesión.');
    }
  };

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-3xl border border-line shadow-soft p-6">
        <div className="mb-4 flex justify-center">
          <Logo variant="lockup" size={36} />
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

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-ink text-white font-medium disabled:opacity-40"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <a
          href="/forgot-password"
          className="block text-center text-sm text-muted mt-4 hover:text-ink"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </form>
    </main>
  );
}
