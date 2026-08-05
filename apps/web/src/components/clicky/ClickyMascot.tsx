'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cuerpo visual de Clicky — mascota pixel-art (8-bit) de un cursor de
 * mouse (flecha de "click") con cara. Grilla de 9x9 "sprites" grandes
 * (pocos píxeles, bien gruesos) — a tamaños chicos (botón flotante de
 * ~40-56px) el detalle fino no se lee, así que priorizamos una silueta
 * simple y ojos grandes por encima de fidelidad al cursor real.
 */

const SIZE = 9; // grilla cuadrada NxN

// Cuña/triángulo que ensancha hacia abajo-derecha — lee como flecha de
// cursor apuntando arriba-izquierda, sin necesitar una colita fina.
function isBody(r: number, c: number): boolean {
  return c <= Math.min(r + 2, SIZE - 1);
}

// Ojos grandes 2x2, en la zona ancha del cuerpo.
const EYES = [
  { col0: 1, pupilCol: 2 },
  { col0: 4, pupilCol: 4 },
];
const EYE_ROW_TOP = 4;
const EYE_ROW_BOTTOM = 5;

type Palette = { body: string; shade: string; white: string; pupil: string };

const PALETTE: Palette = {
  body:  '#FF8A3D',
  shade: 'var(--ce-accent, #F26A1F)',
  white: '#FFFFFF',
  pupil: '#0B0B0F',
};
const PALETTE_LOCKED: Palette = {
  body: '#C9C9C0', shade: '#A6A69C', white: '#FFFFFF', pupil: '#3A3A36',
};

function cellColor(r: number, c: number, blink: boolean, p: Palette): string | null {
  const inEyeRow = r === EYE_ROW_TOP || r === EYE_ROW_BOTTOM;
  const eye = inEyeRow ? EYES.find((e) => c === e.col0 || c === e.col0 + 1) : undefined;

  if (eye) {
    if (blink) return r === EYE_ROW_TOP ? p.body : p.shade;
    if (r === EYE_ROW_BOTTOM && c === eye.pupilCol) return p.pupil;
    return p.white;
  }

  if (!isBody(r, c)) return null;
  return r >= 6 ? p.shade : p.body;
}

export function ClickyMascot({ size = 44, locked = false, awake = true }: {
  size?: number;
  locked?: boolean;
  awake?: boolean;
}) {
  const [blink, setBlink] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!awake) { setBlink(true); return; }
    setBlink(false);
    function scheduleBlink() {
      timeoutRef.current = setTimeout(() => {
        setBlink(true);
        timeoutRef.current = setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 130);
      }, 1800 + Math.random() * 2600);
    }
    scheduleBlink();
    return () => clearTimeout(timeoutRef.current);
  }, [awake]);

  const unit = Math.floor(size / SIZE);
  const total = unit * SIZE;
  const palette = locked ? PALETTE_LOCKED : PALETTE;

  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${SIZE}, ${unit}px)`,
        gridTemplateRows: `repeat(${SIZE}, ${unit}px)`,
        width: total,
        height: total,
        filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.18))',
      }}
    >
      {Array.from({ length: SIZE }).map((_, r) => (
        Array.from({ length: SIZE }).map((__, c) => {
          const color = cellColor(r, c, blink, palette);
          return (
            <div
              key={`${r}-${c}`}
              style={{ width: unit, height: unit, background: color ?? 'transparent' }}
            />
          );
        })
      ))}
    </div>
  );
}
