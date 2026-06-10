'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  /** 'mark' = solo símbolo (cuadrado redondeado con icono).
   *  'lockup' = símbolo + wordmark al lado.
   *  'wordmark' = solo el texto sin símbolo. */
  variant?: 'mark' | 'lockup' | 'wordmark';
  /** Tamaño del símbolo en px (lado del cuadrado). Default 32. */
  size?: number;
  /** Si lockup, controla si el texto sigue al símbolo o queda debajo (stacked). */
  stacked?: boolean;
  /** Color de fondo del mark (default ink). En lockup oscuro pierde contraste con dark UIs. */
  bg?: string;
  /** Color del símbolo dentro del mark (default white). */
  fg?: string;
  /** Color del wordmark. Default heredado (currentColor). */
  textColor?: string;
  className?: string;
}

/**
 * Logo del proyecto ClickToEat.
 *
 * El mark es un cuadrado redondeado con un cursor de mouse cruzado con un
 * pequeño tenedor — la idea: "haz click para comer". Se ve bien en pantalla,
 * imprime nítido en QR cards y funciona como app icon.
 *
 * Wordmark renderea "ClickToEat" en la fuente Bricolage Grotesque (display)
 * con el "To" sutilmente atenuado para enfatizar las dos acciones (Click + Eat).
 */
export function Logo({
  variant = 'lockup', size = 32, stacked = false,
  bg = '#0B0B0F', fg = '#FFFFFF', textColor,
  className,
}: LogoProps) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="ClickToEat"
      style={{ flexShrink: 0 }}
    >
      <rect x="0" y="0" width="32" height="32" rx="8" fill={bg} />
      {/* Cursor de mouse (esquina superior izq) */}
      <path
        d="M9 8 L9 19 L12.5 16 L14.5 20 L16.8 19 L14.8 15 L19 15 Z"
        fill={fg}
      />
      {/* Tenedor estilizado abajo (3 dientes pequeños + mango) */}
      <g fill={fg}>
        <rect x="18" y="9"  width="1.4" height="5" rx="0.7" />
        <rect x="20" y="9"  width="1.4" height="5" rx="0.7" />
        <rect x="22" y="9"  width="1.4" height="5" rx="0.7" />
        <rect x="18" y="13.5" width="5.4" height="1.8" rx="0.9" />
        <rect x="20.3" y="14.5" width="0.8" height="10" rx="0.4" />
      </g>
    </svg>
  );

  if (variant === 'mark') {
    return <span className={cn('inline-block', className)}>{mark}</span>;
  }

  const wordmark = (
    <span
      className="ce-display font-bold leading-none"
      style={{
        color: textColor,
        fontSize: stacked ? size * 0.6 : size * 0.7,
        letterSpacing: '-0.02em',
      }}
    >
      Click<span style={{ opacity: 0.5 }}>To</span>Eat
    </span>
  );

  if (variant === 'wordmark') {
    return <span className={cn('inline-block', className)}>{wordmark}</span>;
  }

  // lockup
  return (
    <span
      className={cn(
        'inline-flex items-center',
        stacked ? 'flex-col gap-1' : 'gap-2',
        className,
      )}
    >
      {mark}
      {wordmark}
    </span>
  );
}
