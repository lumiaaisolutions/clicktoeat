'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Modal responsive:
 *  - desktop (≥md): tarjeta centrada, ancho según `size`.
 *  - móvil: bottom-sheet a pantalla completa con drag handle visual,
 *    desliza hacia arriba al abrir.
 *  - bloquea el scroll del body mientras está abierto.
 *  - cerrar con ESC, click en backdrop o swipe-down (en mobile).
 */
export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);

    // bloquear scroll body
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:px-4">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            // En móvil: slide-up desde abajo. En desktop: scale + fade.
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            className={cn(
              'relative bg-white w-full overflow-hidden flex flex-col',
              // móvil
              'rounded-t-3xl max-h-[92vh]',
              // desktop
              'md:rounded-3xl md:max-h-[90vh] md:w-full md:my-auto md:shadow-glass',
              size === 'sm' && 'md:max-w-sm',
              size === 'md' && 'md:max-w-lg',
              size === 'lg' && 'md:max-w-3xl',
            )}
          >
            {/* Drag handle visual — solo móvil */}
            <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <span className="block w-10 h-1.5 rounded-full bg-line" />
            </div>

            {title && (
              <header className="px-4 md:px-6 pt-2 md:pt-5 pb-3 flex items-center justify-between border-b border-line bg-white shrink-0">
                <h2 className="ce-display text-lg md:text-xl font-bold truncate pr-2">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="tap-target rounded-xl hover:bg-line/50 grid place-items-center shrink-0"
                >
                  ✕
                </button>
              </header>
            )}

            <div className="overflow-auto scroll-fine flex-1 px-4 md:px-6 py-4 md:py-6 pb-safe">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
