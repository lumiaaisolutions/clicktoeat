'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/store/toast';
import { cn } from '@/lib/utils';

const TONE: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  error:   'bg-red-600 text-white',
  info:    'bg-ink text-white',
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={() => dismiss(t.id)}
            className={cn('px-4 py-3 rounded-2xl shadow-glass text-sm font-medium text-left', TONE[t.kind])}
          >
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
