'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandLoader } from './BrandLoader';

/**
 * Overlay que aparece brevemente al cambiar de pathname (navegación client-side
 * de App Router). El primer pathname NO dispara el loader — eso lo cubre
 * InitialLoader. Cada cambio posterior muestra el loader `durationMs` ms.
 *
 * Si Next.js está cargando RSC con su propio `loading.tsx`, también se ve
 * encima — coexisten sin conflicto.
 */
export function RouteTransition({ durationMs = 600 }: { durationMs?: number }) {
  const pathname = usePathname();
  const firstRender = useRef(true);
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setShowing(true);
    const t = setTimeout(() => setShowing(false), durationMs);
    return () => clearTimeout(t);
  }, [pathname, durationMs]);

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          key="route-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-[190]"
          aria-hidden
        >
          <BrandLoader compact />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
