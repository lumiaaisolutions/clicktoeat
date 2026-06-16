'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, tokenStore } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';

interface SignupResponse {
  user:  { id: number; nombre: string; email: string; rol: string };
  token: string;
}

export default function RegistroPage() {
  const router = useRouter();
  const [nombre,   setNombre]   = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (password !== confirm) {
      setErrors({ password_confirmation: 'Las contraseñas no coinciden' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<SignupResponse>('/auth/signup-prospect', {
        nombre, email, password, password_confirmation: confirm,
      });
      tokenStore.set(data.token);
      router.push('/onboarding/elegir-plan');
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen grid place-items-center px-6 py-10 relative">
      <Link href="/" className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition px-3 py-1.5 rounded-lg hover:bg-line/40">
        <Icon name="arrow-right" size={14} className="rotate-180" />
        Volver al inicio
      </Link>

      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl border border-line shadow-soft p-6">
        <div className="mb-4 flex justify-center"><Logo variant="lockup" size={36} /></div>
        <h1 className="ce-display text-xl font-bold text-center">Crea tu cuenta</h1>
        <p className="text-sm text-muted text-center mb-6">14 días gratis, sin tarjeta.</p>

        <label className="block text-sm font-medium mb-1">Tu nombre</label>
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full mb-1 px-3 py-2 border border-line rounded-xl"
          maxLength={120}
        />
        {errors.nombre && <p className="text-xs text-red-600 mb-2">{errors.nombre}</p>}

        <label className="block text-sm font-medium mt-3 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full mb-1 px-3 py-2 border border-line rounded-xl"
        />
        {errors.email && <p className="text-xs text-red-600 mb-2">{errors.email}</p>}

        <label className="block text-sm font-medium mt-3 mb-1">Contraseña</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full mb-1 px-3 py-2 border border-line rounded-xl"
        />
        {errors.password && <p className="text-xs text-red-600 mb-2">{errors.password}</p>}

        <label className="block text-sm font-medium mt-3 mb-1">Confirma contraseña</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="w-full mb-3 px-3 py-2 border border-line rounded-xl"
        />
        {errors.password_confirmation && <p className="text-xs text-red-600 mb-2">{errors.password_confirmation}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-ink text-white font-medium disabled:opacity-40"
        >
          {loading ? 'Creando…' : 'Crear cuenta y elegir plan'}
        </button>

        <p className="text-center text-sm text-muted mt-4">
          ¿Ya tienes cuenta? <Link href="/login" className="text-ink underline">Entra</Link>
        </p>
      </form>

      <p className="absolute bottom-5 inset-x-0 text-center text-xs text-muted">
        Desarrollado por <a href="https://lumiaaisolutions.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink/70 hover:text-ink underline-offset-2 hover:underline">LUMIA</a>
      </p>
    </main>
  );
}
