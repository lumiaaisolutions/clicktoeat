'use client';

import { motion } from 'framer-motion';
import { Logo } from './Logo';

/**
 * Pantalla de carga branded. Logo (mark + wordmark) con respiración,
 * mesh gradient orbs y dots de progreso. Reusable para:
 *  - InitialLoader (mount inicial / recarga)
 *  - RouteTransition (cambio de pathname)
 *  - app/loading.tsx (RSC suspense de Next.js)
 *
 * Variante: `compact` (sin orbs, menos vertical) para sub-rutas.
 */
export function BrandLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={
      'absolute inset-0 grid place-items-center overflow-hidden bg-[color:var(--ce-bg)]'
    }>
      {/* Mesh gradient orbs — solo en variante full */}
      {!compact && (
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <motion.div
            initial={{ opacity: 0.3, scale: 0.9 }}
            animate={{ opacity: [0.3, 0.5, 0.3], scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="hero-orb"
            style={{ background: '#F26A1F', width: 420, height: 420, top: '15%', left: '-10%' }}
          />
          <motion.div
            initial={{ opacity: 0.2, scale: 0.9 }}
            animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="hero-orb"
            style={{ background: '#FFA62D', width: 360, height: 360, bottom: '10%', right: '-10%' }}
          />
        </div>
      )}

      <div className="relative flex flex-col items-center gap-5">
        {/* Mark animado: pulse de halo + breathe */}
        <div className="relative">
          {/* Halo expandiéndose */}
          <motion.span
            aria-hidden
            initial={{ scale: 1, opacity: 0.35 }}
            animate={{ scale: [1, 1.6, 1.6], opacity: [0.35, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-2xl"
            style={{ background: '#F26A1F' }}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{
              scale:   { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.4, ease: 'easeOut' },
            }}
            className="relative"
          >
            <Logo variant="mark" size={compact ? 56 : 72} />
          </motion.div>
        </div>

        {/* Wordmark con fade-in delayed */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col items-center gap-1"
        >
          <span className="ce-display text-2xl font-bold tracking-tight">
            Click<span className="opacity-50">To</span>Eat
          </span>
          <span className="text-[11px] uppercase tracking-[0.22em] text-muted">
            Cargando
          </span>
        </motion.div>

        {/* Dots staggered */}
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0.2, y: 0 }}
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
              className="w-1.5 h-1.5 rounded-full bg-ink/70"
            />
          ))}
        </div>
      </div>

      {/* Texto inferior (versión, sutil) */}
      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.22em] text-muted/70">
        ClickToEat
      </span>
    </div>
  );
}
