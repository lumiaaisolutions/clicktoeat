'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const emailFromUrl = params.get('email') ?? '';

  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="ce-display text-xl font-bold text-red-600">Enlace inválido</h1>
        <p className="text-sm text-muted mt-3 mb-6">
          El enlace de reset no contiene un token válido. Solicita uno nuevo.
        </p>
        <Link
          href="/forgot-password"
          className="block text-center w-full py-3 rounded-2xl bg-ink text-white font-medium"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmation,
      });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors?.email?.[0]
        ?? err?.response?.data?.message
        ?? 'No pudimos restablecer la contraseña.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <h1 className="ce-display text-xl font-bold">¡Listo!</h1>
        <p className="text-sm text-muted mt-3 mb-6">
          Contraseña restablecida. Redirigiendo al login…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="ce-display text-xl font-bold text-center">Nueva contraseña</h1>
      <p className="text-sm text-muted text-center mb-6">
        Mínimo 8 caracteres con letras y números.
      </p>

      <label className="block text-sm font-medium mb-1">Email</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full mb-3 px-3 py-2 border border-line rounded-xl"
        readOnly={!!emailFromUrl}
      />

      <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
      <input
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-3 px-3 py-2 border border-line rounded-xl"
      />

      <label className="block text-sm font-medium mb-1">Confirmar contraseña</label>
      <input
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-line rounded-xl"
      />

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-2xl bg-ink text-white font-medium disabled:opacity-40"
      >
        {loading ? 'Guardando…' : 'Restablecer contraseña'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-line shadow-soft p-6">
        <div className="mb-4 flex justify-center">
          <Logo variant="lockup" size={36} />
        </div>
        <Suspense fallback={<div className="text-sm text-muted text-center">Cargando…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
