'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useHelpCenter } from '@/store/helpCenter';
import { getTour, type TourStep } from './tours';
import { Icon } from '@/components/ui/Icon';
import { TourIllustration } from './TourIllustration';

interface Rect { top: number; left: number; width: number; height: number }

export function TourOverlay() {
  const activeTour = useHelpCenter((s) => s.activeTour);
  const dismiss    = useHelpCenter((s) => s.dismiss);
  const [stepIdx, setStepIdx] = useState(0);

  const steps = useMemo<TourStep[]>(() => activeTour ? (getTour(activeTour) ?? []) : [], [activeTour]);
  const step  = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  useEffect(() => { setStepIdx(0); }, [activeTour]);

  useEffect(() => {
    if (!activeTour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setStepIdx((i) => (i < steps.length - 1 ? i + 1 : i));
      }
      if (e.key === 'ArrowLeft') setStepIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTour, steps.length, dismiss]);

  if (!activeTour || !step) return null;
  if (typeof document === 'undefined') return null;

  // Portal a <body> para evitar containing blocks creados por ancestors con
  // transform/will-change/filter — clave para que position: fixed se respete
  // contra el viewport real (sino el tooltip queda descentrado).
  return createPortal(
    <AnimatePresence mode="wait">
      <TourStepView
        key={`${activeTour}-${stepIdx}`}
        step={step}
        index={stepIdx}
        total={steps.length}
        isLast={isLast}
        onNext={() => isLast ? dismiss() : setStepIdx((i) => i + 1)}
        onPrev={() => setStepIdx((i) => Math.max(0, i - 1))}
        onSkip={dismiss}
        onClose={dismiss}
      />
    </AnimatePresence>,
    document.body,
  );
}

function TourStepView({
  step, index, total, isLast, onNext, onPrev, onSkip, onClose,
}: {
  step: TourStep;
  index: number;
  total: number;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta mobile (< 768px). En mobile NUNCA mostramos highlight del target
  // ni placement direccional — el tour vive siempre centrado y los pasos
  // funcionan como una guía visual sin referenciar elementos detrás.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    // En mobile no necesitamos el rect del target (tour siempre center)
    if (isMobile) { setRect(null); return; }
    if (!step.target) { setRect(null); return; }
    const measure = () => {
      const el = document.querySelector(step.target!) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      if (r.top < 80 || r.top > window.innerHeight - 80) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step.target, isMobile]);

  // En mobile fuerza center. En desktop respeta el placement del step.
  const placement = isMobile ? 'center' : (step.placement ?? (rect ? 'bottom' : 'center'));

  /**
   * Calcula la posición del tooltip. IMPORTANTE: NO usamos `transform` para
   * centrar porque framer-motion lo sobreescribe con su transform de
   * animación (scale, y) — el bug que causaba descentrado.
   *
   * En su lugar, usamos un wrapper exterior con `display:grid; place-items`
   * para el caso "center", y para los demás placements pre-calculamos
   * `top/left` finales aplicando el offset (negativo) del ancho/alto del
   * tooltip manualmente (sin transform).
   */
  const positionerStyle = useMemo<React.CSSProperties>(() => {
    // Caso "center" o sin target: el wrapper hace el centrado con CSS
    if (!rect || placement === 'center') {
      return {
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        pointerEvents: 'none', // el tooltip propio reactiva pointer-events
      };
    }
    // Casos con target: posicionamos un wrapper-punto y usamos place-items
    // para offset según placement con margin.
    const margin = 18;
    const padding = 8;
    let style: React.CSSProperties = { position: 'fixed', display: 'grid', padding, pointerEvents: 'none' };
    switch (placement) {
      case 'top':
        style = { ...style, top: 0, left: 0, width: '100vw', height: rect.top - margin, alignItems: 'end', justifyItems: 'center' };
        break;
      case 'bottom':
        style = { ...style, top: rect.top + rect.height + margin, left: 0, width: '100vw', alignItems: 'start', justifyItems: 'center' };
        break;
      case 'left':
        style = { ...style, top: 0, left: 0, width: rect.left - margin, height: '100vh', alignItems: 'center', justifyItems: 'end' };
        break;
      case 'right':
        style = { ...style, top: 0, left: rect.left + rect.width + margin, right: 0, height: '100vh', alignItems: 'center', justifyItems: 'start' };
        break;
    }
    return style;
  }, [rect, placement]);

  const progress = ((index + 1) / total) * 100;

  return (
    <>
      {/* Backdrop con blur sutil */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[90]"
        onClick={onClose}
        aria-label="Cerrar tour"
        style={{ background: 'rgba(11, 11, 15, 0.62)', backdropFilter: 'blur(3px)' }}
      />

      {/* Spotlight + halo pulsante sobre el target */}
      {rect && !isMobile && (
        <>
          <motion.div
            key={`spot-${index}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed z-[91] pointer-events-none rounded-2xl"
            style={{
              top:   rect.top - 6,
              left:  rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow:
                '0 0 0 9999px rgba(11, 11, 15, 0.55),' +
                '0 0 0 3px rgba(255,255,255,0.92),' +
                '0 14px 40px -10px rgba(0,0,0,0.55)',
            }}
          />
          {/* Halo pulse — anillo que late hacia afuera para llamar la atención */}
          <motion.div
            key={`halo-${index}`}
            className="fixed z-[91] pointer-events-none rounded-2xl border-2"
            style={{
              top:   rect.top - 6,
              left:  rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              borderColor: 'rgba(255,255,255,0.85)',
            }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.95, 0.35, 0.95] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* Tooltip — wrapper exterior posiciona, motion.div anima.
          Separados para que el transform de la animación no sobreescriba
          el transform de centrado. */}
      <div className="z-[92]" style={positionerStyle}>
      <motion.div
        key={`tooltip-${index}`}
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        className="bg-white rounded-2xl shadow-glass border border-line overflow-hidden w-full max-w-[min(380px,calc(100vw-32px))] pointer-events-auto"
      >
        {/* Progress bar arriba */}
        <div className="h-1 bg-line/50 relative">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-[color:var(--ce-accent,#FF2D2D)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            {step.icon && (
              <motion.div
                initial={{ rotate: -10, scale: 0.85 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 grid place-items-center shrink-0 text-amber-700 ring-1 ring-amber-200"
              >
                <Icon name={step.icon} size={20} />
              </motion.div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Paso {index + 1} de {total}
              </p>
              <motion.h3
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08, duration: 0.25 }}
                className="ce-display text-lg sm:text-xl font-bold mt-0.5 leading-tight"
              >
                {step.title}
              </motion.h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar tour"
              className="shrink-0 w-8 h-8 rounded-lg grid place-items-center hover:bg-line/50 text-muted hover:text-ink transition"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Visual aid: ilustración SVG animada > video > imagen */}
          {step.illustration && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mt-3 rounded-xl border border-line bg-line/20 p-4 grid place-items-center"
            >
              <TourIllustration name={step.illustration} />
            </motion.div>
          )}
          {!step.illustration && step.video && (
            <video
              src={step.video}
              autoPlay loop muted playsInline
              className="mt-3 w-full rounded-xl border border-line"
              aria-label={`Demostración: ${step.title}`}
            />
          )}
          {!step.illustration && !step.video && step.image && (
            <img src={step.image} alt="" loading="lazy" className="mt-3 w-full rounded-xl border border-line" />
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="text-sm text-ink/80 leading-relaxed mt-3"
          >
            {step.body}
          </motion.p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-4">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-ink' : i < index ? 'w-1.5 bg-ink/40' : 'w-1.5 bg-line'}`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={index === 0 ? onSkip : onPrev}
              className="text-sm font-medium text-muted hover:text-ink px-3 py-2 rounded-xl hover:bg-line/40 tap-target"
            >
              {index === 0 ? 'Saltar' : 'Atrás'}
            </button>
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold hover:opacity-90 tap-target hover:-translate-y-0.5 transition-transform"
            >
              {isLast ? '¡Listo!' : 'Siguiente'}
              <Icon name={isLast ? 'check' : 'arrow-right'} size={14} />
            </button>
          </div>
        </div>
      </motion.div>
      </div>
    </>
  );
}
