'use client';

import {
  useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value: string | number | undefined;
  onChange: (value: string) => void;
  /** Opciones. Alternativa: pasar <option> como children (compat con selects nativos). */
  options?: SelectOption[];
  children?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** 'field' = estilo de formulario (default). 'pill' = píldora tipo hero. */
  variant?: 'field' | 'pill';
  /** color de acento (por defecto el naranja de marca). */
  accent?: string;
  'aria-label'?: string;
  'data-tour'?: string;
  id?: string;
  name?: string;
}

/** Lee <option> children a SelectOption[] para compat con la API nativa. */
function optionsFromChildren(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  const walk = (nodes: ReactNode) => {
    (Array.isArray(nodes) ? nodes : [nodes]).forEach((n: any) => {
      if (!n) return;
      if (Array.isArray(n)) return walk(n);
      if (n?.type === 'option') {
        out.push({
          value: String(n.props.value ?? ''),
          label: n.props.children,
          disabled: n.props.disabled,
        });
      } else if (n?.props?.children) {
        walk(n.props.children);
      }
    });
  };
  walk(children);
  return out;
}

/**
 * Select accesible y animado (listbox custom) que reemplaza al `<select>` nativo
 * en todo el sistema. Teclado completo, aria-activedescendant, foco visible,
 * apertura con spring, resalte del elegido y un micro "efecto burbuja" al elegir.
 * Respeta prefers-reduced-motion y cuida móvil (touch ≥44px, sin scroll horizontal).
 */
export function Select({
  value, onChange, options, children, placeholder = 'Elige…',
  disabled, className, variant = 'field', accent = '#F26A1F',
  'aria-label': ariaLabel, 'data-tour': dataTour, id, name,
}: SelectProps) {
  const opts = useMemo(() => options ?? optionsFromChildren(children), [options, children]);
  const reduce = useReducedMotion();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; width: number; up: boolean; maxH: number } | null>(null);
  const [active, setActive] = useState(-1);
  const [burbuja, setBurbuja] = useState<{ i: number; k: number } | null>(null);
  const typeahead = useRef({ q: '', t: 0 });

  useEffect(() => { setMounted(true); }, []);

  const selectedIdx = opts.findIndex((o) => String(o.value) === String(value ?? ''));
  const selected = selectedIdx >= 0 ? opts[selectedIdx] : null;

  // Posiciona el panel en coordenadas de viewport (portal fixed): inmune a
  // cualquier ancestro con overflow-hidden. Decide si abre hacia arriba.
  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    const up = below < 260 && above > below;
    const maxH = Math.max(120, Math.min(256, (up ? above : below) - 12));
    setCoords({ left: r.left, top: up ? r.top : r.bottom, width: r.width, up, maxH });
  };

  const flipUp = coords?.up ?? false;

  const abrir = () => {
    if (disabled) return;
    place();
    setActive(selectedIdx >= 0 ? selectedIdx : opts.findIndex((o) => !o.disabled));
    setOpen(true);
  };
  const cerrar = () => { setOpen(false); btnRef.current?.focus(); };

  const elegir = (i: number) => {
    const o = opts[i];
    if (!o || o.disabled) return;
    setBurbuja({ i, k: Date.now() });
    setOpen(false);
    onChange(String(o.value));
  };

  // Cerrar al hacer click fuera (el panel vive en un portal → chequear ambos refs).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    // Reposicionar mientras esté abierto (scroll de cualquier ancestro + resize).
    const reposition = () => place();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  // Recolocar en el primer frame tras abrir (por si cambió el layout).
  useLayoutEffect(() => { if (open) place(); }, [open]);

  // Mantener la opción activa visible.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const move = (dir: 1 | -1) => {
    setActive((cur) => {
      let i = cur;
      for (let n = 0; n < opts.length; n++) {
        i = (i + dir + opts.length) % opts.length;
        if (!opts[i].disabled) return i;
      }
      return cur;
    });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); move(-1); break;
      case 'Home': e.preventDefault(); setActive(opts.findIndex((o) => !o.disabled)); break;
      case 'End': e.preventDefault(); setActive(opts.map((o) => !o.disabled).lastIndexOf(true)); break;
      case 'Enter': case ' ': e.preventDefault(); if (active >= 0) elegir(active); break;
      case 'Escape': e.preventDefault(); cerrar(); break;
      case 'Tab': setOpen(false); break;
      default:
        if (e.key.length === 1) {
          const now = Date.now();
          typeahead.current.q = now - typeahead.current.t > 700 ? e.key : typeahead.current.q + e.key;
          typeahead.current.t = now;
          const q = typeahead.current.q.toLowerCase();
          const i = opts.findIndex((o) => typeof o.label === 'string' && (o.label as string).toLowerCase().startsWith(q));
          if (i >= 0) setActive(i);
        }
    }
  };

  const dur = reduce ? 0 : 0.16;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={btnRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        data-tour={dataTour}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : abrir())}
        onKeyDown={onKey}
        className={cn(
          'w-full min-h-[44px] inline-flex items-center justify-between gap-2 text-left text-sm transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'pill'
            ? 'px-4 py-2.5 rounded-full text-white font-semibold shadow-sm'
            : 'px-3 py-2 rounded-xl border bg-white',
          variant === 'field' && (open ? 'border-transparent' : 'border-line hover:border-ink/25'),
        )}
        style={{
          ...(variant === 'pill' ? { background: accent } : {}),
          ...(variant === 'field' && open
            ? { boxShadow: `0 0 0 2px ${accent}, 0 8px 20px -12px ${accent}66` }
            : {}),
        }}
      >
        <span className={cn('truncate', !selected && variant === 'field' && 'text-muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: dur }} className="shrink-0 opacity-70">
          <Icon name="chevron-down" size={16} />
        </motion.span>
      </button>

      {/* input oculto para que el valor viaje en forms nativos si hace falta */}
      {name && <input type="hidden" name={name} value={value ?? ''} readOnly />}

      {mounted && createPortal(
        <AnimatePresence>
          {open && coords && (
          <motion.ul
            key="listbox"
            ref={listRef}
            id={listId}
            role="listbox"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: flipUp ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: flipUp ? 4 : -4, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              left: coords.left,
              width: 'max-content',
              minWidth: coords.width,
              maxWidth: 'min(20rem, 86vw)',
              maxHeight: coords.maxH,
              ...(flipUp
                ? { top: coords.top, transform: 'translateY(-100%)', marginTop: -6 }
                : { top: coords.top, marginTop: 6 }),
            }}
            className={cn(
              'z-[60] overflow-y-auto scroll-fine rounded-2xl border border-line bg-white p-1.5 shadow-[0_18px_50px_-16px_rgba(20,12,6,0.35)]',
            )}
          >
            {opts.map((o, i) => {
              const isSel = String(o.value) === String(value ?? '');
              const isAct = i === active;
              return (
                <li
                  key={`${o.value}-${i}`}
                  id={`${listId}-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onClick={() => elegir(i)}
                  className={cn(
                    'relative overflow-hidden flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors',
                    o.disabled && 'opacity-40 cursor-not-allowed',
                    isAct && !o.disabled && 'bg-[var(--ce-hover)]',
                  )}
                  style={{
                    // resalte del activo/elegido con el acento
                    ['--ce-hover' as any]: `${accent}14`,
                    ...(isSel ? { background: `${accent}1f`, color: accent } : {}),
                  }}
                >
                  {/* efecto burbuja al elegir */}
                  {burbuja?.i === i && !reduce && (
                    <motion.span
                      key={burbuja.k}
                      initial={{ scale: 0, opacity: 0.5 }}
                      animate={{ scale: 6, opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      onAnimationComplete={() => setBurbuja(null)}
                      className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
                      style={{ background: accent, opacity: 0.25 }}
                    />
                  )}
                  <motion.span
                    className="relative z-10 truncate font-medium"
                    animate={burbuja?.i === i && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                    transition={{ duration: 0.28 }}
                  >
                    {o.label}
                  </motion.span>
                  {isSel && <Icon name="check" size={15} className="relative z-10 shrink-0" />}
                </li>
              );
            })}
            {opts.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-muted">Sin opciones</li>
            )}
          </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
