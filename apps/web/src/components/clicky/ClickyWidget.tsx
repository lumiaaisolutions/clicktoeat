'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { usePlan, Features } from '@/store/plan';
import { useHelpCenter } from '@/store/helpCenter';
import { Icon } from '@/components/ui/Icon';
import { ClickyMascot } from './ClickyMascot';
import { CLICKY_QUICK_ACTIONS } from './clickyFaq';

interface ChatMessage {
  role: 'clicky' | 'user';
  text: string;
}

const GREETING: ChatMessage = {
  role: 'clicky',
  text: '¡Hola! Soy Clicky 👋 Pregúntame cómo hacer algo en tu panel, o elige una de estas dudas comunes.',
};

/**
 * Clicky — asistente del panel (F103). Botón flotante con mascota de ojos
 * parpadeantes. Al abrir, ofrece dudas comunes que disparan los tours
 * scripteados existentes (spotlight real sobre el botón exacto) y un chat
 * libre de fallback contra Gemini (`POST /clicky/ask`) para lo que no
 * calce en el guion. Bloqueado (con upsell) en el plan Essential.
 *
 * Ver docs/features/clicky-assistant.md.
 */
export function ClickyWidget() {
  const hasClicky = usePlan((s) => s.has(Features.CLICKY_ASSISTANT));
  const planLoaded = usePlan((s) => s.plan !== null);
  const pathname = usePathname();
  const router = useRouter();
  const openTour = useHelpCenter((s) => s.openTour);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingTour, setPendingTour] = useState<{ slug: string; route: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // Si la duda rápida requería navegar a otro módulo, arranca el tour en
  // cuanto la ruta nueva termina de montar (deja que AdminPageHeader y los
  // data-tour de la página aparezcan antes de medir el target).
  useEffect(() => {
    if (!pendingTour || pathname !== pendingTour.route) return;
    const t = setTimeout(() => {
      openTour(pendingTour.slug);
      setPendingTour(null);
    }, 300);
    return () => clearTimeout(t);
  }, [pathname, pendingTour, openTour]);

  // No renderizar hasta saber el plan (evita parpadeo bloqueado→desbloqueado)
  if (!planLoaded) return null;

  function handleQuickAction(question: string, reply: string, tourSlug: string, route: string) {
    setMessages((m) => [...m, { role: 'user', text: question }, { role: 'clicky', text: reply }]);
    setTimeout(() => {
      setOpen(false);
      if (pathname === route) {
        openTour(tourSlug);
      } else {
        setPendingTour({ slug: tourSlug, route });
        router.push(route);
      }
    }, 650);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post<{ data: { reply: string } }>('/clicky/ask', {
        message: text,
        pathname,
      });
      setMessages((m) => [...m, { role: 'clicky', text: data.data.reply || 'No tengo una respuesta clara para eso, intenta reformular tu pregunta.' }]);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = status === 429
        ? 'Has hecho muchas preguntas por hoy, dame un rato y vuelve a intentar 🙏'
        : 'No pude responder ahora mismo. Intenta de nuevo en un momento.';
      setMessages((m) => [...m, { role: 'clicky', text: msg }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={hasClicky ? 'Abrir a Clicky, tu asistente del panel' : 'Clicky — función de plan Profesional/Premium'}
        title={hasClicky ? 'Clicky, tu asistente' : 'Clicky (Profesional/Premium)'}
        className="fixed bottom-6 right-5 z-[70] w-16 h-16 rounded-full bg-white shadow-glass border border-line grid place-items-center hover:scale-105 active:scale-95 transition tap-target"
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
      >
        <ClickyMascot size={46} locked={!hasClicky} />
        {!hasClicky && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ink text-white grid place-items-center">
            <Icon name="lock" size={11} />
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed bottom-24 right-5 z-[70] w-[min(360px,calc(100vw-32px))] max-h-[min(560px,calc(100vh-140px))] bg-white rounded-3xl shadow-glass border border-line flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-gradient-to-r from-amber-50 to-white shrink-0">
              <ClickyMascot size={36} locked={!hasClicky} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">Clicky</p>
                <p className="text-[11px] text-muted leading-tight">Tu asistente del panel</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-line/50 text-muted hover:text-ink transition"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {hasClicky ? (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-[220px]">
                  {messages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      <div
                        className={
                          m.role === 'user'
                            ? 'max-w-[85%] rounded-2xl rounded-tr-sm bg-ink text-white text-sm px-3.5 py-2.5'
                            : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-line/40 text-ink text-sm px-3.5 py-2.5'
                        }
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-tl-sm bg-line/40 text-muted text-sm px-3.5 py-2.5">
                        Clicky está pensando…
                      </div>
                    </div>
                  )}

                  {messages.length <= 1 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {CLICKY_QUICK_ACTIONS.map((qa) => (
                        <button
                          key={qa.tourSlug}
                          type="button"
                          onClick={() => handleQuickAction(qa.question, qa.reply, qa.tourSlug, qa.route)}
                          className="text-left text-xs font-medium px-3 py-2 rounded-xl border border-line hover:border-ink/40 hover:bg-line/30 transition flex items-center gap-2 tap-target"
                        >
                          <Icon name={qa.icon} size={14} className="shrink-0 text-muted" />
                          <span className="truncate">{qa.question}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-center gap-2 px-3 py-3 border-t border-line shrink-0"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu duda…"
                    maxLength={400}
                    disabled={sending}
                    className="flex-1 min-w-0 text-sm px-3.5 py-2.5 rounded-xl border border-line bg-bg focus:outline-none focus:border-ink/40"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    aria-label="Enviar"
                    className="shrink-0 w-10 h-10 rounded-xl bg-ink text-white grid place-items-center disabled:opacity-40 hover:opacity-90 transition tap-target"
                  >
                    <Icon name="arrow-right" size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="p-6 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 grid place-items-center">
                  <Icon name="lock" size={20} className="text-amber-700" />
                </div>
                <h3 className="ce-display text-lg font-bold">Clicky es parte de Profesional y Premium</h3>
                <p className="text-sm text-muted">
                  Mejora tu plan para tener un asistente que te guía en tiempo real, señalando exactamente dónde pulsar en cada pantalla.
                </p>
                <a
                  href="/admin/billing"
                  className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-medium hover:opacity-90 transition tap-target"
                >
                  Ver planes
                  <Icon name="arrow-right" size={14} />
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
