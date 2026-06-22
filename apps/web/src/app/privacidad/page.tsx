'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';

export default function PrivacidadPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg,    setMsg]    = useState<string | null>(null);

  const solicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMsg(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/public/borrar-mis-datos`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? 'Error');
      setStatus('done');
      setMsg(body.message);
    } catch (err: any) {
      setStatus('error');
      setMsg(err?.message ?? 'No pudimos procesar.');
    }
  };

  return (
    <main className="min-h-screen bg-[#FBF8F3]">
      <header className="border-b border-line bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo variant="lockup" size={26} />
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-ink inline-flex items-center gap-1">
            <Icon name="arrow-right" size={12} className="rotate-180" />
            Inicio
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10 prose prose-sm sm:prose-base">
        <p className="text-xs uppercase tracking-[0.18em] text-muted font-bold">Privacidad</p>
        <h1 className="ce-display text-3xl sm:text-4xl font-bold mt-2">Aviso de privacidad</h1>
        <p className="text-muted">Última actualización: 15 de junio de 2026</p>

        <h2 className="ce-display font-bold text-xl mt-8">Quiénes somos</h2>
        <p>
          ClickToEat es operado por LUMIA Solutions, con domicilio en México. Este aviso explica qué datos
          recopilamos cuando usas la plataforma, ya seas dueño de un local o un cliente que hace un pedido.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">Qué datos recopilamos</h2>
        <ul>
          <li><strong>De los locales:</strong> nombre del negocio, dirección, WhatsApp, teléfono, datos de pago (procesados por Stripe).</li>
          <li><strong>De clientes finales:</strong> nombre, teléfono y, opcionalmente, correo y dirección de entrega.</li>
          <li><strong>De pedidos:</strong> productos, monto, hora y forma de pago.</li>
          <li><strong>Cookies técnicas:</strong> sesión, preferencia de tema (claro/oscuro) y carrito.</li>
        </ul>

        <h2 className="ce-display font-bold text-xl mt-6">Para qué los usamos</h2>
        <ul>
          <li>Procesar y entregar pedidos.</li>
          <li>Enviar confirmaciones por correo (si dejas tu email).</li>
          <li>Llevar el historial de tu local y sus métricas.</li>
          <li>Cobrar la suscripción mensual a los locales (vía Stripe — no almacenamos tarjetas).</li>
        </ul>

        <h2 className="ce-display font-bold text-xl mt-6">Con quién los compartimos</h2>
        <ul>
          <li><strong>Stripe</strong> (procesador de pagos).</li>
          <li><strong>WhatsApp</strong> (vía deep-link; no usamos su API oficial).</li>
          <li><strong>Cloudinary / Hostinger</strong> (almacenamiento de imágenes y BD).</li>
        </ul>
        <p>No vendemos tus datos a terceros con fines de marketing.</p>

        <h2 className="ce-display font-bold text-xl mt-6">Cuánto tiempo los guardamos</h2>
        <p>
          Los pedidos se conservan hasta 24 meses para fines fiscales y de soporte. Después se anonimizan.
          Tus datos de inicio de sesión se borran 30 días después de inactividad.
        </p>

        <h2 className="ce-display font-bold text-xl mt-6">Tus derechos (ARCO / GDPR)</h2>
        <p>
          Tienes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos. Si quieres
          que borremos tu información personal de los pedidos donde apareces, usa el formulario de abajo.
          Procesamos la solicitud al momento.
        </p>

        {/* Formulario borrado */}
        <div className="not-prose mt-8 rounded-2xl border border-line bg-white p-5">
          <p className="ce-display font-bold mb-2">Borrar mis datos</p>
          <p className="text-sm text-muted mb-3">
            Escribe el correo que usaste al hacer pedidos. Borraremos tu nombre, teléfono, dirección y email
            de todos los pedidos en los que aparezcas. El histórico interno del local conserva sólo monto y productos.
          </p>
          <form onSubmit={solicitar} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@correo.com"
              className="flex-1 px-3 py-2 border border-line rounded-xl bg-white"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="px-4 py-2 rounded-xl bg-ink text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {status === 'sending' ? 'Procesando…' : 'Solicitar borrado'}
            </button>
          </form>
          {status === 'done' && msg && (
            <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              {msg}
            </p>
          )}
          {status === 'error' && msg && (
            <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {msg}
            </p>
          )}
        </div>

        <h2 className="ce-display font-bold text-xl mt-8">Contacto</h2>
        <p>
          Cualquier duda escribe a{' '}
          <a href="mailto:soporte@lumiaaisolutions.com" className="text-[#F26A1F] underline">
            soporte@lumiaaisolutions.com
          </a>.
        </p>
      </article>

      <p className="text-center text-xs text-muted py-8">
        Desarrollado por{' '}
        <a href="https://lumiaaisolutions.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink/70 hover:text-ink">
          LUMIA
        </a>
      </p>
    </main>
  );
}
