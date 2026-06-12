'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No pudimos procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-line shadow-soft p-6">
        <div className="mb-4 flex justify-center">
          <Logo variant="lockup" size={36} />
        </div>

        {sent ? (
          <>
            <h1 className="ce-display text-xl font-bold text-center">Revisa tu correo</h1>
            <p className="text-sm text-muted text-center mt-3 mb-6">
              Si <strong>{email}</strong> existe en el sistema, te enviamos un enlace para
              restablecer tu contraseña. El enlace expira en 60 minutos.
            </p>
            <Link
              href="/login"
              className="block text-center w-full py-3 rounded-2xl bg-ink text-white font-medium"
            >
              Volver al login
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <h1 className="ce-display text-xl font-bold text-center">Recuperar contraseña</h1>
            <p className="text-sm text-muted text-center mb-6">
              Te enviaremos un enlace para restablecerla.
            </p>

            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-4 px-3 py-2 border border-line rounded-xl"
              placeholder="tu@email.com"
            />

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-ink text-white font-medium disabled:opacity-40"
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-muted mt-4 hover:text-ink"
            >
              ← Volver al login
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
