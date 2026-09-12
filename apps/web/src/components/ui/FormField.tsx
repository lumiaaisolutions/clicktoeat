'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Select as SelectBase } from './Select';

const baseInputClass = cn(
  // tamaños táctiles cómodos en móvil
  'w-full px-3 py-2.5 md:py-2 min-h-[44px] md:min-h-0',
  'border rounded-xl bg-white outline-none transition',
  'text-base md:text-sm',  // globals.css fuerza 16px en mobile para evitar zoom iOS
  'focus:border-ink/60 focus:ring-2 focus:ring-ink/10',
);

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, className, ...rest },
  ref,
) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <input
        ref={ref}
        className={cn(
          baseInputClass,
          error ? 'border-red-400' : 'border-line',
          className,
        )}
        {...rest}
      />
      {hint && !error && <span className="block text-xs text-muted mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, ...rest },
  ref,
) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <textarea
        ref={ref}
        rows={3}
        className={cn(
          baseInputClass,
          'min-h-[88px]',
          error ? 'border-red-400' : 'border-line',
          className,
        )}
        {...rest}
      />
      {hint && !error && <span className="block text-xs text-muted mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Select({ label, hint, error, className, children, ...rest }: SelectProps) {
  // Delegamos al Select animado/accesible (custom listbox). Mantenemos la API con
  // evento nativo para que los usos existentes (`onChange={(e)=>...e.target.value}`)
  // no cambien.
  const onChange = rest.onChange as React.ChangeEventHandler<HTMLSelectElement> | undefined;
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <SelectBase
        value={rest.value as string | number | undefined}
        onChange={(v) => onChange?.({ target: { value: v } } as unknown as React.ChangeEvent<HTMLSelectElement>)}
        disabled={rest.disabled}
        className={className}
        id={rest.id}
        name={rest.name}
        data-tour={(rest as Record<string, unknown>)['data-tour'] as string | undefined}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        {children}
      </SelectBase>
      {hint && !error && <span className="block text-xs text-muted mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

interface SwitchProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  'data-tour'?: string;
}

export function Switch({ label, hint, checked, onChange, ...rest }: SwitchProps) {
  return (
    <label className="flex items-start justify-between gap-3 mb-3 cursor-pointer py-1" {...rest}>
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 rounded-full transition shrink-0 tap-target',
          checked ? 'bg-ink' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </label>
  );
}
