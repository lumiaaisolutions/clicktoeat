'use client';

import {
  useCallback, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

// ───────────────────────────────────────────────────────────────────────────
// Botones de acción del sistema — ver / editar / borrar / crear.
// Cada uno con una micro-animación de firma. Sólo Borrar tiene "mantén
// presionado para confirmar" (hold-to-delete). Accesibles (teclado + aria) y
// respetan prefers-reduced-motion.
// ───────────────────────────────────────────────────────────────────────────

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

type IconBtnProps = {
  onClick?: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  'data-tour'?: string;
};

/** Contenedor compacto reutilizable para los botones de icono (ver/editar). */
function iconBtnClass(extra?: string) {
  return cn(
    'group relative inline-grid place-items-center w-9 h-9 rounded-xl border border-line bg-white text-ink/70',
    'transition-colors hover:text-ink hover:border-ink/25 outline-none',
    'focus-visible:ring-2 focus-visible:ring-[color:var(--ce-accent,#F26A1F)] focus-visible:ring-offset-1',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    extra,
  );
}

// ── Acción secundaria neutral — ícono + tooltip, con micro-hover ───────────
// Para botones tipo "Historial", "Ajustar", "Receta", etc. (los que se parecen
// a Editar/Ver pero no son de los 4 arquetipos). Se puede usar como botón
// (onClick) o como enlace (href) conservando la navegación.
export function ActionButton({
  icon, label, onClick, href, newTab, className, disabled, ...rest
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
  newTab?: boolean;
  className?: string;
  disabled?: boolean;
  'data-tour'?: string;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const glyph = (
    <motion.span
      className="inline-grid place-items-center"
      animate={hover && !reduce ? { y: -1.5, scale: 1.14 } : { y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 15 }}
    >
      <Icon name={icon} size={17} />
    </motion.span>
  );
  const cls = iconBtnClass(className);

  if (href) {
    return (
      <motion.a
        href={href} aria-label={label} title={label} data-tour={rest['data-tour']} className={cls}
        target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined}
        onHoverStart={() => setHover(true)} onHoverEnd={() => setHover(false)}
      >
        {glyph}
      </motion.a>
    );
  }
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-tour={rest['data-tour']}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileTap={{ scale: 0.92 }}
      className={cls}
    >
      {glyph}
    </motion.button>
  );
}

// ── Ver — ojo que parpadea ─────────────────────────────────────────────────
export function ViewButton({ onClick, label = 'Ver', className, disabled, ...rest }: IconBtnProps) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const on = hover && !reduce;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-tour={rest['data-tour']}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileTap={{ scale: 0.92 }}
      className={iconBtnClass(className)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" {...S} aria-hidden>
        {/* contorno del ojo */}
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        {/* pupila que parpadea (scaleY) en hover */}
        <motion.circle
          cx="12" cy="12" r="3"
          animate={on ? { scaleY: [1, 0.1, 1], opacity: [1, 0.2, 1] } : { scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.55, times: [0, 0.5, 1], repeat: on ? Infinity : 0, repeatDelay: 0.6 }}
          style={{ transformOrigin: '12px 12px' }}
        />
      </svg>
    </motion.button>
  );
}

// ── Editar — lápiz que "escribe" en hover ──────────────────────────────────
export function EditButton({ onClick, label = 'Editar', className, disabled, ...rest }: IconBtnProps) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const on = hover && !reduce;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-tour={rest['data-tour']}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileTap={{ scale: 0.92 }}
      className={iconBtnClass(className)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        {/* trazo que el lápiz "escribe" */}
        <motion.path
          d="M4 20c3-1 6-1.4 9-1.4"
          {...S}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={on ? { pathLength: [0, 1, 1], opacity: [0, 0.7, 0] } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 0.7, times: [0, 0.7, 1], repeat: on ? Infinity : 0 }}
          style={{ stroke: 'var(--ce-accent, #F26A1F)' }}
        />
        {/* lápiz que se mueve como escribiendo */}
        <motion.g
          {...S}
          animate={on ? { x: [0, 7, 0], y: [0, -1.4, 0], rotate: [0, -4, 0] } : { x: 0, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, times: [0, 0.7, 1], ease: 'easeInOut', repeat: on ? Infinity : 0 }}
          style={{ transformOrigin: '12px 12px' }}
        >
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </motion.g>
      </svg>
    </motion.button>
  );
}

// ── Crear — "+" con efecto líquido en hover ────────────────────────────────
export function CreateButton({
  onClick, label, className, disabled, icon, ...rest
}: {
  onClick?: () => void;
  label: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  'data-tour'?: string;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const on = hover && !reduce;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-tour={rest['data-tour']}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white',
        'outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ce-accent,#F26A1F)] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {/* blob líquido que sube y ondula al hover */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 z-0"
          initial={false}
          animate={on
            ? { y: '0%', borderRadius: ['50% 50% 0 0 / 60% 60% 0 0', '40% 60% 0 0 / 55% 45% 0 0', '0% 0% 0 0 / 0% 0% 0 0'] }
            : { y: '105%', borderRadius: '50% 50% 0 0 / 60% 60% 0 0' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: 'linear-gradient(180deg, var(--ce-accent,#F26A1F), #E15412)' }}
        />
      )}
      <motion.span
        aria-hidden
        className="relative z-10 grid place-items-center"
        animate={on ? { rotate: 90 } : { rotate: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      >
        {icon ?? <svg width="17" height="17" viewBox="0 0 24 24" {...S}><path d="M12 5v14" /><path d="M5 12h14" /></svg>}
      </motion.span>
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}

// ── Borrar — mantén presionado para confirmar + bola de papel al basurero ───
type DeleteState = 'idle' | 'holding' | 'deleting';

export function DeleteButton({
  onDelete, label = 'Mantener\npara eliminar', holdMs = 1100, className, disabled, compact = false, ...rest
}: {
  onDelete: () => void | Promise<void>;
  label?: string;
  holdMs?: number;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
  'data-tour'?: string;
}) {
  const reduce = useReducedMotion();
  const [state, setState] = useState<DeleteState>('idle');
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyHeld = useRef(false);

  const clearTimer = () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };

  const complete = useCallback(() => {
    clearTimer();
    setState('deleting');
    const fire = () => { void onDelete(); };
    if (reduce) { fire(); return; }
    // deja correr la animación de la bola de papel antes de ejecutar
    window.setTimeout(fire, 650);
  }, [onDelete, reduce]);

  const startHold = () => {
    if (disabled || state !== 'idle') return;
    setState('holding');
    holdTimer.current = setTimeout(complete, holdMs);
  };
  const cancelHold = () => {
    if (state !== 'holding') return;
    clearTimer();
    setState('idle');
  };

  useEffect(() => () => clearTimer(), []);

  const holding = state === 'holding';

  return (
    <motion.button
      type="button"
      disabled={disabled || state === 'deleting'}
      aria-label={holding ? 'Suelta para cancelar el borrado' : 'Mantener presionado para eliminar'}
      title="Mantener presionado para eliminar"
      data-tour={rest['data-tour']}
      onPointerDown={(e) => { e.preventDefault(); startHold(); }}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !keyHeld.current) { e.preventDefault(); keyHeld.current = true; startHold(); } }}
      onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') { keyHeld.current = false; cancelHold(); } }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className={cn(
        'group relative inline-flex select-none items-center justify-center gap-1 overflow-hidden rounded-lg border font-medium outline-none transition-colors',
        holding
          ? 'border-red-600 bg-red-500 text-white'
          : 'border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50/70',
        'focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        compact ? 'text-[10px] px-2 py-1.5' : 'text-xs px-2.5 py-2',
        className,
      )}
    >
      {/* relleno rojo sólido que crece mientras se mantiene presionado */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 z-0 bg-red-700"
          initial={{ width: '0%' }}
          animate={{ width: holding ? '100%' : '0%' }}
          transition={{ duration: holding ? holdMs / 1000 : 0.18, ease: 'linear' }}
        />
      )}

      {/* contenido normal (basurero + label) */}
      <AnimatePresence mode="wait" initial={false}>
        {state !== 'deleting' ? (
          <motion.span
            key="idle"
            className="relative z-10 inline-flex items-center gap-1.5"
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" {...S} aria-hidden>
              {/* tapa del basurero — tiembla mientras se mantiene */}
              <motion.g
                animate={holding && !reduce ? { rotate: [0, -8, 6, -6, 0] } : { rotate: 0 }}
                transition={holding ? { duration: 0.4, repeat: Infinity } : { duration: 0.2 }}
                style={{ transformOrigin: '12px 6px' }}
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
              </motion.g>
              <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
            </svg>
            <span className="relative z-10 whitespace-pre-line text-left leading-[1.05]">{label}</span>
          </motion.span>
        ) : (
          // animación de "bola de papel al basurero"
          <motion.span key="del" className="relative z-10 inline-flex items-center justify-center" style={{ minWidth: compact ? 0 : 56 }}>
            <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden>
              {/* bola de papel arqueándose hacia el bote */}
              {!reduce && (
                <motion.circle
                  r="3" fill="var(--ce-accent, #F26A1F)"
                  initial={{ cx: 3, cy: 3, opacity: 0 }}
                  animate={{ cx: [3, 9, 13], cy: [3, 0, 14], opacity: [0, 1, 0], scale: [1, 1, 0.4] }}
                  transition={{ duration: 0.5, ease: 'easeIn', times: [0, 0.5, 1] }}
                />
              )}
              {/* bote */}
              <g fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <motion.g
                  initial={{ rotate: 0 }}
                  animate={reduce ? {} : { rotate: [0, -18, 0] }}
                  transition={{ duration: 0.5, times: [0, 0.4, 0.75] }}
                  style={{ transformOrigin: '13px 8px' }}
                >
                  <path d="M8 8h10" />
                </motion.g>
                <path d="M9.5 9.5v9a1.5 1.5 0 0 0 1.5 1.5h4a1.5 1.5 0 0 0 1.5-1.5v-9" />
              </g>
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
