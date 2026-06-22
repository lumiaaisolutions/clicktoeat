'use client';

/**
 * /demo — Simulador público sin registro.
 *
 * Permite a un prospecto editar nombre, eslogan, colores y tipografía y ver
 * el cambio reflejado en una mini-vista previa estilo landing en tiempo real.
 * No requiere backend ni cuenta. CTA fuerte para crear cuenta al final.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const TEMPLATES = [
  { id: 'mexicana',  nombre: 'Tacos El Gordo',   eslogan: 'Pastor de leña, tortillas a mano', primario: '#F26A1F', fondo: '#FAFAF7', fuente: 'Bricolage Grotesque' },
  { id: 'italiana',  nombre: 'Pizza Bambino',    eslogan: 'Napolitana 72h de fermentación',   primario: '#16A34A', fondo: '#FFF8EC', fuente: 'Playfair Display' },
  { id: 'cafeteria', nombre: 'Café de la Plaza', eslogan: 'Tostado en grano fresco',           primario: '#92400E', fondo: '#FEF7E9', fuente: 'Cormorant Garamond' },
  { id: 'postres',   nombre: 'Stitch Postres',   eslogan: 'Rebanadas para llevar',              primario: '#E91E8C', fondo: '#FFF7FB', fuente: 'DM Serif Display' },
];

const FUENTES = ['Bricolage Grotesque', 'Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Manrope', 'Inter', 'Fraunces'];

export default function DemoPage() {
  const [nombre,    setNombre]    = useState(TEMPLATES[0].nombre);
  const [eslogan,   setEslogan]   = useState(TEMPLATES[0].eslogan);
  const [primario,  setPrimario]  = useState(TEMPLATES[0].primario);
  const [fondo,     setFondo]     = useState(TEMPLATES[0].fondo);
  const [fuente,    setFuente]    = useState(TEMPLATES[0].fuente);

  const aplicar = (t: typeof TEMPLATES[number]) => {
    setNombre(t.nombre);
    setEslogan(t.eslogan);
    setPrimario(t.primario);
    setFondo(t.fondo);
    setFuente(t.fuente);
  };

  return (
    <main className="min-h-screen bg-[#FBF8F3]">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo variant="lockup" size={26} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 halo-pulse" />
              Modo demo
            </span>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 transition shadow-soft"
            >
              Quiero el mío
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero pitch */}
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs uppercase tracking-[0.18em] text-muted font-bold inline-flex items-center gap-2">
            <Icon name="sparkles" size={14} className="text-[#F26A1F]" />
            Pruébalo en vivo
          </p>
          <h1 className="ce-display text-3xl sm:text-5xl font-bold leading-[1.05] mt-3">
            Así de fácil se ve tu local <br />
            <span className="gradient-text">con ClickToEat.</span>
          </h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            Cambia los datos abajo y mira el preview a la derecha. Sin registro, sin tarjeta, sin compromiso.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Panel de edición */}
          <div className="lg:col-span-2 space-y-5">
            {/* Plantillas rápidas */}
            <div className="rounded-3xl border border-line bg-white p-5">
              <p className="ce-display font-bold mb-3">Empieza con una plantilla</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => aplicar(t)}
                    className="rounded-2xl border border-line hover:border-ink/40 overflow-hidden text-left transition group"
                  >
                    <div className="h-12 relative" style={{ background: t.fondo }}>
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="text-sm font-bold" style={{ color: t.primario, fontFamily: `"${t.fuente}", system-ui, sans-serif` }}>Aa</span>
                      </div>
                      <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: t.primario }} />
                    </div>
                    <p className="text-[11px] font-bold p-2 truncate">{t.nombre}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor identidad */}
            <div className="rounded-3xl border border-line bg-white p-5">
              <p className="ce-display font-bold mb-3">Tu local</p>
              <label className="text-xs font-semibold text-muted block mb-1">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-xl mb-3 bg-white"
                maxLength={60}
              />
              <label className="text-xs font-semibold text-muted block mb-1">Eslogan</label>
              <input
                value={eslogan}
                onChange={(e) => setEslogan(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-xl bg-white"
                maxLength={120}
              />
            </div>

            {/* Editor visual */}
            <div className="rounded-3xl border border-line bg-white p-5">
              <p className="ce-display font-bold mb-3">Identidad visual</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Color principal</label>
                  <div className="flex gap-2">
                    <input type="color" value={primario} onChange={(e) => setPrimario(e.target.value)} className="h-10 w-12 rounded-lg border border-line cursor-pointer" />
                    <input type="text" value={primario} onChange={(e) => setPrimario(e.target.value)} className="flex-1 px-2 rounded-lg border border-line font-mono text-xs bg-white" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Fondo</label>
                  <div className="flex gap-2">
                    <input type="color" value={fondo} onChange={(e) => setFondo(e.target.value)} className="h-10 w-12 rounded-lg border border-line cursor-pointer" />
                    <input type="text" value={fondo} onChange={(e) => setFondo(e.target.value)} className="flex-1 px-2 rounded-lg border border-line font-mono text-xs bg-white" />
                  </div>
                </div>
              </div>

              <label className="text-xs font-semibold text-muted block mt-3 mb-1">Tipografía</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {FUENTES.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFuente(f)}
                    className={cn(
                      'rounded-lg border p-2 text-center transition',
                      fuente === f ? 'border-ink/60 bg-ink/5 shadow-soft' : 'border-line bg-white hover:border-ink/30',
                    )}
                    style={{ fontFamily: `"${f}", system-ui, sans-serif` }}
                  >
                    <span className="text-base block leading-none">Aa</span>
                    <span className="text-[9px] text-muted">{f.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA final */}
            <div className="rounded-3xl border-2 border-ink/15 bg-gradient-to-br from-white via-amber-50/40 to-white p-5">
              <p className="ce-display font-bold text-lg">¿Te gustó cómo se ve?</p>
              <p className="text-sm text-muted mt-1">
                Crea tu cuenta y obtén tu URL pública en menos de 5 minutos. Prueba gratis 14 días.
              </p>
              <Link
                href="/onboarding"
                className="mt-3 inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 transition shadow-soft w-full justify-center"
              >
                Crear mi cuenta
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>

          {/* Preview tipo phone */}
          <div className="lg:col-span-3">
            <div className="sticky top-20">
              <p className="text-xs uppercase tracking-wider text-muted mb-2 text-center">Así lo verán tus clientes</p>
              <div
                className="mx-auto rounded-[36px] border-[14px] border-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] overflow-hidden"
                style={{ background: fondo, maxWidth: 380 }}
              >
                {/* Header */}
                <div className="relative h-52 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primario}40, ${primario}20)` }}>
                  <div className="absolute inset-0 grid place-items-center">
                    <div
                      className="w-20 h-20 rounded-3xl bg-white shadow-md grid place-items-center text-3xl font-bold"
                      style={{ color: primario, fontFamily: `"${fuente}", system-ui, sans-serif` }}
                    >
                      {nombre[0]?.toUpperCase() ?? '·'}
                    </div>
                  </div>
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/95 text-white text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-white halo-pulse" />Abierto
                  </span>
                </div>

                <div className="px-5 pt-5 pb-4 text-center">
                  <h2
                    className="font-bold text-2xl leading-tight"
                    style={{ color: '#0B0B0F', fontFamily: `"${fuente}", system-ui, sans-serif`, letterSpacing: '-0.01em' }}
                  >
                    {nombre || 'Tu local'}
                  </h2>
                  {eslogan && (
                    <p className="text-sm text-ink/60 mt-1.5">{eslogan}</p>
                  )}
                </div>

                {/* Categorías mock */}
                <div className="px-4 flex gap-1.5 overflow-hidden">
                  {['Destacados', 'Bebidas', 'Postres'].map((c, i) => (
                    <span
                      key={c}
                      className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap border')}
                      style={i === 0
                        ? { background: primario, color: '#fff', borderColor: primario }
                        : { background: '#fff', color: '#374151', borderColor: '#E5E7EB' }}
                    >
                      {c}
                    </span>
                  ))}
                </div>

                {/* 3 productos mock */}
                <div className="p-3 grid gap-2">
                  {[
                    { n: 'Producto destacado', p: '$120', tag: 'TOP' },
                    { n: 'Otro favorito',      p: '$95'  },
                    { n: 'Recomendado',         p: '$140' },
                  ].map((p, i) => (
                    <div key={i} className="rounded-2xl border border-line bg-white p-2.5 flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold truncate">{p.n}</p>
                        <p className="text-[10px] text-muted">Lorem ipsum descripción corta</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums" style={{ color: primario }}>{p.p}</p>
                        {p.tag && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white" style={{ background: primario }}>{p.tag}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA WhatsApp */}
                <div className="p-3 pb-5">
                  <div
                    className="rounded-2xl py-3 text-white text-sm font-bold text-center"
                    style={{ background: primario, fontFamily: `"${fuente}", system-ui, sans-serif` }}
                  >
                    Pedir por WhatsApp →
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted mt-4">
                <Icon name="check-circle" size={12} className="inline mr-1" />
                Los cambios solo viven en tu navegador. Cuando creas tu cuenta, lo configuras de verdad.
              </p>
            </div>
          </div>
        </div>

        {/* Footer LUMIA */}
        <p className="text-center text-xs text-muted mt-12">
          Desarrollado por{' '}
          <a href="https://lumiaaisolutions.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink/70 hover:text-ink underline-offset-2 hover:underline">
            LUMIA
          </a>
        </p>
      </section>
    </main>
  );
}
