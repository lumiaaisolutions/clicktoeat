'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandLoader } from './BrandLoader';

/**
 * Loader que se renderiza durante el primer mount del cliente.
 *
 * SSR renderiza el overlay (visible=true). Cliente hidrata y, tras un
 * mínimo perceptual de 500 ms, dispara el fade-out con AnimatePresence.
 * Sin hydration mismatch — el initial state es idéntico en server y client.
 *
 * Cubre: carga inicial, recarga (F5/Cmd+R).
 */
export function InitialLoader({ minDurationMs = 500 }: { minDurationMs?: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), minDurationMs);
    return () => clearTimeout(t);
  }, [minDurationMs]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="initial-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="fixed inset-0 z-[200]"
          aria-hidden
        >
          <BrandLoader />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
