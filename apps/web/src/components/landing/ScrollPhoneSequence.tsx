'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';

/**
 * Sección scroll-scrubbed estilo Apple: un phone sticky y, conforme el usuario
 * scrollea por un contenedor largo, el contenido del phone va "barriendo"
 * frames (catálogo → detalle → checkout → WhatsApp → recibido).
 *
 * Implementación: useScroll() entrega scrollYProgress (0→1) a lo largo del
 * container. Cada frame mapea a un rango y se cross-fadea con AnimatePresence
 * via opacity transforms (más estable que swappear nodos enteros).
 *
 * Por qué no PNG real: no tenemos render del producto vivo y volver a expor-
 * tar frames cada vez que cambia la UI es costoso. Mantener todo en SVG/HTML
 * dentro del phone es self-documenting.
 */

const STEPS = [
  {
    title: 'Tu cliente elige',
    desc: 'Entra a tu URL pública, ve tu menú con fotos, precios y disponibilidad en tiempo real.',
    accent: 'Catálogo',
  },
  {
    title: 'Personaliza el pedido',
    desc: 'Variantes, extras y notas. El precio se actualiza al momento — sin sorpresas.',
    accent: 'Checkout',
  },
  {
    title: 'Envía por WhatsApp',
    desc: 'Un solo toque abre WhatsApp con el mensaje completo. Cero formularios.',
    accent: 'WhatsApp',
  },
  {
    title: 'Tú confirmas y entregas',
    desc: 'El pedido entra a tu panel con todo el detalle. Confirmas, despachas, listo.',
    accent: 'Panel',
  },
];

export function ScrollPhoneSequence() {
  return (
    <>
      <MobileLayout />
      <DesktopLayout />
    </>
  );
}

/* ─────────── Desktop (lg+): split sticky con scroll-scrubbing ─────────── */

function DesktopLayout() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      ref={ref}
      className="relative bg-[color:var(--ce-bg)] hidden lg:block"
      style={{ height: '320vh' }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 grid place-items-center px-6">
          <div className="w-full max-w-6xl grid grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
                <Icon name="sparkles" size={14} className="text-ink/60" />
                Así funciona
              </p>
              <h2 className="ce-display mt-3 text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight">
                Del antojo al pedido<br />
                en <span className="text-ink/60">cuatro pasos</span>.
              </h2>

              <ol className="mt-8 space-y-3">
                {STEPS.map((s, i) => (
                  <Step key={s.title} index={i} step={s} progress={scrollYProgress} />
                ))}
              </ol>
            </div>

            <div className="flex justify-center">
              <PhoneShell progress={scrollYProgress} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Mobile: lista limpia con iconos grandes (sin phone) ─────────── */

/**
 * En mobile NO mostramos el phone porque el usuario ya está usando uno —
 * meter otra simulación de phone sobre el texto crea overlap, ruido y se
 * pierde el contenido. La narrativa de "qué ve el cliente" funciona mejor
 * como lista de cards con icono representativo de cada paso.
 */
function MobileLayout() {
  const STEP_ICONS = {
    Catálogo: 'utensils',
    Checkout: 'plus',
    WhatsApp: 'whatsapp',
    Panel:    'storefront',
  } as const;

  return (
    <section className="lg:hidden relative bg-[color:var(--ce-bg)] py-20">
      <div className="px-4 sm:px-6 max-w-xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4 }}
          className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2"
        >
          <Icon name="sparkles" size={14} className="text-ink/60" />
          Así funciona
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
          className="ce-display mt-3 text-3xl sm:text-4xl font-bold leading-[1.05] tracking-tight"
        >
          Del antojo al pedido<br />
          en <span className="text-ink/60">cuatro pasos</span>.
        </motion.h2>

        <ol className="mt-10 space-y-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
              className="group flex gap-4 items-start rounded-2xl border border-line bg-white p-4 hover:border-ink/30 transition-colors"
            >
              {/* Icono grande representativo del paso */}
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[color:var(--ce-bg)] border border-line grid place-items-center text-ink/80 group-hover:scale-110 transition-transform">
                <Icon name={STEP_ICONS[s.accent as keyof typeof STEP_ICONS]} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium tracking-widest text-muted">
                    0{i + 1}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-muted/50" />
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium">
                    {s.accent}
                  </p>
                </div>
                <h3 className="ce-display text-lg font-bold mt-1.5 leading-tight">
                  {s.title}
                </h3>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─────────── Step item lateral ─────────── */

function Step({
  index, step, progress,
}: {
  index: number;
  step: typeof STEPS[number];
  progress: MotionValue<number>;
}) {
  const total = STEPS.length;
  // Cada step "domina" un cuarto del scroll. El highlight aparece cuando
  // su rango central está cerca del progreso actual.
  const start = index / total;
  const end   = (index + 1) / total;

  const opacity = useTransform(progress, [start - 0.08, start, end, end + 0.08], [0.35, 1, 1, 0.4]);
  const x       = useTransform(progress, [start - 0.08, start], [-6, 0]);
  const barH    = useTransform(progress, [start, end], ['0%', '100%']);

  return (
    <motion.li
      style={{ opacity, x }}
      className="flex gap-4 items-start"
    >
      <div className="relative shrink-0 w-8 flex flex-col items-center">
        <span className="text-[10px] font-medium tracking-widest text-muted">
          0{index + 1}
        </span>
        <span className="mt-2 w-px flex-1 bg-line relative h-12">
          <motion.span
            style={{ height: barH }}
            className="absolute left-0 top-0 w-px bg-ink origin-top"
          />
        </span>
      </div>
      <div className="-mt-0.5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium">{step.accent}</p>
        <h3 className="ce-display text-xl md:text-2xl font-bold mt-1 leading-tight">{step.title}</h3>
        <p className="text-sm text-muted mt-1.5 max-w-md leading-relaxed">{step.desc}</p>
      </div>
    </motion.li>
  );
}

/* ─────────── Phone con frames cross-fading ─────────── */

function PhoneShell({ progress, compact = false }: { progress: MotionValue<number>; compact?: boolean }) {
  const width = compact ? 'w-[180px]' : 'w-[280px] sm:w-[320px]';
  const borderWidth = compact ? 'border-[7px]' : 'border-[10px]';
  const borderRadius = compact ? 'rounded-[1.6rem]' : 'rounded-[2.4rem]';
  const notchSize = compact ? 'w-14 h-3.5' : 'w-20 h-5';
  return (
    <div className={`relative pointer-events-auto ${width}`}>
      {/* Frame del teléfono */}
      <div className={`relative ${borderRadius} ${borderWidth} border-ink bg-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)] overflow-hidden`}>
        <div className="relative aspect-[9/19] bg-white">
          {/* Notch */}
          <div className={`absolute top-2 left-1/2 -translate-x-1/2 ${notchSize} bg-ink rounded-full z-30`} />

          {/* Frames superpuestos, cada uno crossfade en su rango */}
          <FrameCatalogo progress={progress} />
          <FrameCheckout progress={progress} />
          <FrameWhatsApp progress={progress} />
          <FramePanel    progress={progress} />
        </div>
      </div>

      {/* Indicador de progreso lateral — solo en desktop */}
      {!compact && <ProgressDots progress={progress} />}
    </div>
  );
}

function ProgressDots({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="absolute -left-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3">
      {STEPS.map((_, i) => (
        <ProgressDot key={i} index={i} progress={progress} />
      ))}
    </div>
  );
}

function ProgressDot({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const start = index / STEPS.length;
  const end   = (index + 1) / STEPS.length;
  const scale = useTransform(progress, [start, (start + end) / 2, end], [1, 1.4, 1]);
  const bg    = useTransform(
    progress,
    [start - 0.05, start, end, end + 0.05],
    ['#E8E8E2', '#0B0B0F', '#0B0B0F', '#E8E8E2'],
  );
  return <motion.span style={{ scale, background: bg }} className="w-2 h-2 rounded-full block" />;
}

/* ─────────── Helper: opacity por rango ─────────── */

function useRangeOpacity(progress: MotionValue<number>, index: number) {
  const seg = 1 / STEPS.length;
  const start = index * seg;
  const end   = (index + 1) * seg;
  // Curva: invisible antes/después, full visible en el rango, cross-fade 1/3 hacia los bordes.
  return useTransform(
    progress,
    [start - seg * 0.25, start + seg * 0.1, end - seg * 0.1, end + seg * 0.25],
    [0, 1, 1, 0],
  );
}

/* ─────────── Frame 1: Catálogo ─────────── */

function FrameCatalogo({ progress }: { progress: MotionValue<number> }) {
  const opacity = useRangeOpacity(progress, 0);
  const items = [
    { n: 'Tacos al pastor', p: '$ 28', tag: 'POPULAR' },
    { n: 'Quesadilla', p: '$ 35', tag: null },
    { n: 'Agua de jamaica', p: '$ 18', tag: null },
  ];
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 pt-9 px-3">
      <div className="flex items-center gap-2 mt-1 px-1">
        <div className="w-9 h-9 rounded-full grid place-items-center text-white font-bold ce-display text-sm" style={{ background: '#FF2D2D' }}>T</div>
        <div className="leading-tight">
          <div className="ce-display font-bold text-[13px]">Tu Local</div>
          <div className="text-[9px] text-muted inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Abierto
          </div>
        </div>
      </div>
      <div className="mt-3 px-1">
        <p className="text-[9px] uppercase tracking-widest text-muted">Destacados</p>
      </div>
      <div className="mt-2 space-y-1.5">
        {items.map((it) => (
          <div key={it.n} className="rounded-xl border border-line bg-white p-2.5 flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-medium truncate">{it.n}</p>
                {it.tag && <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-1 rounded">{it.tag}</span>}
              </div>
              <p className="text-[10px] text-muted">{it.p}</p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-ink text-white grid place-items-center shrink-0">
              <Icon name="plus" size={12} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────── Frame 2: Checkout ─────────── */

function FrameCheckout({ progress }: { progress: MotionValue<number> }) {
  const opacity = useRangeOpacity(progress, 1);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 pt-9 px-3">
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <Icon name="chevron-right" size={14} className="rotate-180 text-ink/70" />
        <p className="text-[11px] font-medium">Tacos al pastor</p>
      </div>

      <div className="mt-3 px-1">
        <p className="text-[9px] uppercase tracking-widest text-muted">Tortilla · obligatorio</p>
      </div>
      <div className="mt-1.5 space-y-1">
        {[
          { label: 'Maíz',   price: '+ $0', selected: true },
          { label: 'Harina', price: '+ $5', selected: false },
        ].map((opt) => (
          <div key={opt.label} className={`rounded-lg border ${opt.selected ? 'border-ink bg-ink/5' : 'border-line bg-white'} p-2 flex items-center gap-2`}>
            <span className={`w-3.5 h-3.5 rounded-full border-2 ${opt.selected ? 'border-ink bg-ink' : 'border-line'}`} />
            <span className="text-[11px] flex-1">{opt.label}</span>
            <span className="text-[10px] text-muted">{opt.price}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 px-1">
        <p className="text-[9px] uppercase tracking-widest text-muted">Extras</p>
      </div>
      <div className="mt-1.5 space-y-1">
        {[
          { label: 'Queso', price: '+ $8',  selected: true },
          { label: 'Aguacate', price: '+ $12', selected: false },
        ].map((opt) => (
          <div key={opt.label} className={`rounded-lg border ${opt.selected ? 'border-ink bg-ink/5' : 'border-line bg-white'} p-2 flex items-center gap-2`}>
            <span className={`w-3.5 h-3.5 rounded ${opt.selected ? 'bg-ink' : 'border-2 border-line'}`}>
              {opt.selected && <Icon name="check" size={9} className="text-white" />}
            </span>
            <span className="text-[11px] flex-1">{opt.label}</span>
            <span className="text-[10px] text-muted">{opt.price}</span>
          </div>
        ))}
      </div>

      <div className="absolute left-3 right-3 bottom-3 rounded-xl bg-ink text-white text-[11px] font-medium py-2.5 grid place-items-center">
        Agregar al pedido · $ 36
      </div>
    </motion.div>
  );
}

/* ─────────── Frame 3: WhatsApp ─────────── */

function FrameWhatsApp({ progress }: { progress: MotionValue<number> }) {
  const opacity = useRangeOpacity(progress, 2);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 pt-9">
      {/* WhatsApp header */}
      <div className="px-3 pt-2 pb-2.5 bg-[#075E54] text-white">
        <div className="flex items-center gap-2">
          <Icon name="chevron-right" size={13} className="rotate-180" />
          <div className="w-7 h-7 rounded-full bg-white/20 grid place-items-center ce-display font-bold text-[11px]">T</div>
          <div className="leading-tight">
            <div className="text-[12px] font-semibold">Tu Local</div>
            <div className="text-[8px] opacity-80">en línea</div>
          </div>
        </div>
      </div>
      {/* Chat background */}
      <div className="px-2.5 py-3 bg-[#ECE5DD] flex-1 absolute left-0 right-0 bottom-12 top-[68px] overflow-hidden">
        <div className="ml-auto max-w-[80%] bg-[#DCF8C6] rounded-lg rounded-tr-sm px-2.5 py-2 text-[10px] leading-relaxed text-ink/85 shadow-sm">
          <p className="font-medium">Hola, quisiera ordenar:</p>
          <p className="mt-1">• Tacos al pastor (Maíz, c/ queso)</p>
          <p>• Agua de jamaica</p>
          <p className="mt-1 font-medium">Total: $ 54</p>
          <p className="mt-1">A nombre de: Fer</p>
          <p>Entrega: a domicilio</p>
          <div className="text-right text-[8px] text-ink/40 mt-1">15:42 ✓✓</div>
        </div>
      </div>
      {/* Input bar */}
      <div className="absolute left-0 right-0 bottom-0 bg-white border-t border-line p-2 flex items-center gap-2">
        <div className="flex-1 h-7 rounded-full bg-line/40" />
        <div className="w-7 h-7 rounded-full grid place-items-center" style={{ background: '#25D366' }}>
          <Icon name="whatsapp" size={13} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────── Frame 4: Panel del local ─────────── */

function FramePanel({ progress }: { progress: MotionValue<number> }) {
  const opacity = useRangeOpacity(progress, 3);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 pt-9 px-3">
      <div className="flex items-center gap-2 mt-1 px-1">
        <p className="text-[11px] font-semibold ce-display">Pedidos</p>
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">1 NUEVO</span>
      </div>

      <div className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-amber-900">#A-128 · Fer</span>
          <span className="text-[9px] text-amber-700">hace 12 s</span>
        </div>
        <div className="mt-1.5 space-y-0.5 text-[10px]">
          <p>1× Tacos al pastor (Maíz, c/ queso)</p>
          <p>1× Agua de jamaica</p>
        </div>
        <div className="mt-1.5 flex items-center justify-between border-t border-amber-200 pt-1.5">
          <span className="text-[10px] font-bold">Total $ 54</span>
          <span className="text-[9px] text-emerald-700 font-medium inline-flex items-center gap-1">
            <Icon name="whatsapp" size={9} /> Por WhatsApp
          </span>
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-line bg-white p-2.5 opacity-70">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium">#A-127 · María</span>
          <span className="text-[9px] text-muted">hace 4 min</span>
        </div>
        <p className="text-[10px] text-muted mt-1">Entregado</p>
      </div>

      <div className="absolute left-3 right-3 bottom-3 rounded-xl bg-ink text-white text-[11px] font-medium py-2.5 grid place-items-center">
        Confirmar pedido
      </div>
    </motion.div>
  );
}
