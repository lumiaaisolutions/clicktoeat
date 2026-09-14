'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';

function Contenido() {
  const params = useSearchParams();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    setOk(params.get('ok') === '1');
  }, [params]);

  return (
    <main className="min-h-screen grid place-items-center bg-[#FBF8F3] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Logo variant="lockup" size={30} />
        </div>

        <div className="rounded-3xl border border-line bg-white p-8 shadow-soft">
          {ok === null ? (
            <div className="h-24 animate-pulse rounded-2xl bg-line/40" />
          ) : ok ? (
            <>
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
                <Icon name="check" size={28} />
              </span>
              <h1 className="ce-display text-2xl font-bold">¡Correo confirmado!</h1>
              <p className="mt-2 text-muted">
                Tu correo quedó verificado. Ya puedes recibir tus avisos y recuperar el acceso sin problemas.
              </p>
              <Link
                href="/admin"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-ink/90 transition"
              >
                Ir a mi panel
                <Icon name="arrow-right" size={16} />
              </Link>
            </>
          ) : (
            <>
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                <Icon name="alert-triangle" size={26} />
              </span>
              <h1 className="ce-display text-2xl font-bold">El enlace no es válido</h1>
              <p className="mt-2 text-muted">
                Puede que haya expirado (dura 60 minutos) o ya se haya usado. Entra a tu panel y pide reenviar la confirmación.
              </p>
              <Link
                href="/admin"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-line px-5 py-3 text-sm font-semibold text-ink hover:bg-line/30 transition"
              >
                Ir a mi panel
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CorreoVerificadoPage() {
  return (
    <Suspense fallback={null}>
      <Contenido />
    </Suspense>
  );
}
