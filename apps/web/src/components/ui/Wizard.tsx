'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

/**
 * Chrome reutilizable de un formulario por pasos (asistente):
 * - Desktop: rail lateral con pasos numerados (actual, ✓ completado, pendiente).
 * - Móvil: barra compacta "Paso X de N" + puntos de progreso (el rail se oculta).
 * - Footer contextual: Cancelar → Atrás/Siguiente → Guardar en el último paso.
 *
 * Es presentacional: la lógica de validación/navegación vive en el form que lo usa.
 * El contenido del paso actual se pasa como children.
 */
export function Wizard({
  steps, current, onStep, kicker, title, subtitle,
  onCancel, onBack, onNext, saving, isLast, submitLabel = 'Guardar',
  accent = '#F26A1F', children,
}: {
  steps: string[];
  current: number;            // 1-indexed
  onStep?: (n: number) => void;
  kicker?: string;            // ej. "Paso 1 de 4"
  title: string;              // pregunta guía
  subtitle?: string;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;         // en el último paso, este es el submit
  saving?: boolean;
  isLast: boolean;
  submitLabel?: string;
  accent?: string;
  children: React.ReactNode;
}) {
  const n = steps.length;
  return (
    <div>
      {/* Indicador de pasos — móvil */}
      <div className="md:hidden mb-4">
        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: accent }}>
          Paso {current} de {n}
        </p>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{ background: i < current ? accent : 'var(--ce-line,#e7e5e4)' }}
            />
          ))}
        </div>
        <p className="text-sm font-semibold mt-2">{steps[current - 1]}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
        {/* Rail — desktop */}
        <nav className="hidden md:block" aria-label="Pasos">
          <ol className="space-y-1">
            {steps.map((label, i) => {
              const num = i + 1;
              const activo = num === current;
              const hecho = num < current;
              const clickable = onStep && (num <= current);
              return (
                <li key={num}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && onStep?.(num)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition',
                      activo ? '' : 'hover:bg-line/40',
                      !clickable && 'cursor-default',
                    )}
                    style={activo ? { background: `${accent}1a` } : undefined}
                  >
                    <span
                      className="w-7 h-7 rounded-full grid place-items-center text-sm font-bold shrink-0 transition"
                      style={
                        activo ? { background: accent, color: '#fff' }
                          : hecho ? { background: `${accent}26`, color: accent }
                          : { border: '1px solid var(--ce-line,#e7e5e4)', color: 'var(--ce-muted,#78716c)' }
                      }
                    >
                      {hecho ? '✓' : num}
                    </span>
                    <span className={cn('text-sm font-medium', activo ? 'text-ink' : 'text-muted')}>{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Contenido del paso */}
        <div className="min-h-[280px]">
          {kicker && (
            <p className="hidden md:block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: accent }}>
              {kicker}
            </p>
          )}
          <h3 className="ce-display text-xl font-bold mb-1">{title}</h3>
          {subtitle && <p className="text-sm text-muted mb-4">{subtitle}</p>}
          {!subtitle && <div className="mb-4" />}
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-4 mt-5 border-t border-line">
        <Button type="button" variant="secondary" onClick={current === 1 ? onCancel : onBack}>
          {current === 1 ? 'Cancelar' : '← Atrás'}
        </Button>
        <Button type="button" onClick={onNext} loading={saving}>
          {isLast ? submitLabel : 'Siguiente →'}
        </Button>
      </div>
    </div>
  );
}
