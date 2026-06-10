'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const VARIANT = {
  primary:   'bg-ink text-white hover:opacity-90',
  secondary: 'bg-white border border-line hover:bg-line/30',
  ghost:     'bg-transparent hover:bg-line/40',
  danger:    'bg-red-600 text-white hover:bg-red-700',
};

const SIZE = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-base rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading && <span className="w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
});
