'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LumiaBadge } from '@/components/ui/LumiaBadge';

/**
 * Layout de autenticación (login / registro): formulario a la izquierda,
 * carrusel de valor a la derecha. Responsive: en móvil se muestra solo el
 * formulario. El carrusel es por defecto (editable global super-admin en una
 * fase posterior — ver docs/features/auth-login-redesign.md).
 */
type Slide = { tags: string[]; quote: string; source: string; role: string };

const DEFAULT_SLIDES: Slide[] = [
  {
    tags: ['Sin comisiones', 'Directo a WhatsApp'],
    quote: 'Recibe pedidos por WhatsApp con el mensaje ya armado. La venta es 100% tuya, sin intermediarios.',
    source: 'ClickToEat',
    role: 'Pedidos por WhatsApp',
  },
  {
    tags: ['Tu menú en un link', 'Sin app'],
    quote: 'Tus clientes escanean, ven tu menú con fotos y piden en segundos. Sin descargar nada.',
    source: 'ClickToEat',
    role: 'Menú digital + QR',
  },
  {
    tags: ['Panel simple', 'Todo en un lugar'],
    quote: 'Menú, inventario, pedidos, caja y métricas desde un solo panel. Sin manual.',
    source: 'ClickToEat',
    role: 'Operación del local',
  },
];

export function AuthShell({ children }: { children: ReactNode }) {
  const slides = DEFAULT_SLIDES;
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  const prev = () => setI((n) => (n - 1 + slides.length) % slides.length);
  const next = () => setI((n) => (n + 1) % slides.length);
  const s = slides[i];

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#F26A1F]">
      {/* Malla de gradiente de fondo (cálido) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 60% at 15% 20%, #FF8A47 0%, transparent 60%),' +
            'radial-gradient(55% 55% at 85% 85%, #E85B12 0%, transparent 55%),' +
            'linear-gradient(135deg, #F26A1F, #E85B12)',
        }}
      />

      <Link
        href="/"
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur"
      >
        <Icon name="arrow-right" size={14} className="rotate-180" />
        Volver al inicio
      </Link>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 rounded-[2rem] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] bg-white">
          {/* Formulario */}
          <div className="p-6 sm:p-10 flex flex-col justify-center">
            {children}
          </div>

          {/* Carrusel (oculto en móvil) */}
          <div className="relative hidden lg:block min-h-[560px] m-3 rounded-[1.6rem] overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 transition-[background] duration-700"
              style={{
                background:
                  'radial-gradient(70% 55% at 60% 30%, rgba(255,255,255,0.35) 0%, transparent 55%),' +
                  'radial-gradient(60% 60% at 30% 90%, #7A2E0E 0%, transparent 60%),' +
                  'linear-gradient(160deg, #F79867 0%, #C24A16 55%, #3A1608 100%)',
              }}
            />
            <div className="absolute inset-0 p-7 flex flex-col justify-between text-white">
              <div className="flex flex-wrap gap-2">
                {s.tags.map((t) => (
                  <span key={t} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/20">
                    {t}
                  </span>
                ))}
              </div>

              <div>
                <p className="text-2xl font-bold leading-snug drop-shadow-sm transition-opacity duration-500">
                  “{s.quote}”
                </p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="font-semibold">{s.source}</div>
                    <div className="text-sm text-white/70">{s.role}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={prev} aria-label="Anterior" className="w-10 h-10 grid place-items-center rounded-xl bg-white/15 hover:bg-white/25 ring-1 ring-white/20 transition">
                      <Icon name="arrow-right" size={16} className="rotate-180" />
                    </button>
                    <button onClick={next} aria-label="Siguiente" className="w-10 h-10 grid place-items-center rounded-xl bg-white/15 hover:bg-white/25 ring-1 ring-white/20 transition">
                      <Icon name="arrow-right" size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex gap-1.5">
                  {slides.map((_, idx) => (
                    <span key={idx} className={`h-1 rounded-full transition-all ${idx === i ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
                  ))}
                </div>
              </div>
            </div>

            <a
              href="/"
              className="absolute top-5 right-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-black/20 hover:bg-black/30 backdrop-blur px-3 py-1.5 rounded-lg transition"
            >
              <Icon name="arrow-up-right" size={14} />
              Visitar sitio
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center px-4">
        <LumiaBadge />
      </div>
    </main>
  );
}
