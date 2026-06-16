'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'ce-pwa-install-dismissed';

/**
 * Banner discreto que aparece SÓLO en `/admin/*` cuando el browser dispara
 * `beforeinstallprompt`. Si el usuario lo cierra, se guarda en localStorage
 * y no se vuelve a mostrar por 14 días.
 */
export function InstallPrompt() {
  const [evt, setEvt]     = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen]   = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
    if (dismissed && Date.now() - dismissed < 14 * 86_400_000) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt as EventListener);
  }, []);

  if (!open || !evt) return null;

  const install = async () => {
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      setOpen(false);
    }
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-line bg-white shadow-glass p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center text-amber-700 shrink-0">
          <Icon name="download" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="ce-display font-bold text-sm">Instala ClickToEat</p>
          <p className="text-xs text-muted mt-1">
            Tenlo como app en tu pantalla de inicio. Recibe los pedidos al instante.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-semibold hover:opacity-90"
            >
              Instalar
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-ink hover:bg-line/40"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="text-muted hover:text-ink w-7 h-7 rounded-md grid place-items-center"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
