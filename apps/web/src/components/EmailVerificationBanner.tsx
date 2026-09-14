'use client';

import { useState } from 'react';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Icon } from '@/components/ui/Icon';

/**
 * Aviso suave (no bloqueante) de verificación de correo. Aparece en el panel
 * mientras el usuario no haya confirmado su correo (doble opt-in). El onboarding
 * y toda la operación siguen funcionando; esto solo invita a confirmar para
 * asegurar avisos y recuperación de cuenta.
 */
export function EmailVerificationBanner() {
  const user = useAuth((s) => s.user);
  const [oculto, setOculto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (!user || user.email_verified_at || oculto) return null;

  const reenviar = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      const { data } = await api.post('/auth/email/verification-notification');
      if (data?.verified) {
        toast.success('Tu correo ya estaba verificado.');
        setOculto(true);
      } else {
        setEnviado(true);
        toast.success('Te enviamos el correo de confirmación.');
      }
    } catch {
      toast.error('No pudimos reenviar el correo. Intenta en un momento.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="status"
      className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
        <Icon name="bell" size={18} />
      </span>
      <div className="flex-1 text-sm">
        <p className="font-semibold">Confirma tu correo</p>
        <p className="text-amber-800/90">
          Te enviamos un enlace a <span className="font-medium">{user.email}</span>. Confírmalo para
          asegurar tus avisos y poder recuperar tu cuenta.
        </p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          onClick={reenviar}
          disabled={enviando || enviado}
          className="rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {enviado ? 'Enviado ✓' : enviando ? 'Enviando…' : 'Reenviar'}
        </button>
        <button
          onClick={() => setOculto(true)}
          aria-label="Ocultar aviso"
          className="tap-target grid place-items-center rounded-xl text-amber-700 hover:bg-amber-100"
        >
          <Icon name="x" size={18} />
        </button>
      </div>
    </div>
  );
}
