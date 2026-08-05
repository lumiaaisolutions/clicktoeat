'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cuerpo visual de Clicky — mascota pixel-art (8-bit) de un cursor con
 * cara. Se dibuja como una grilla de "sprites" (divs cuadrados, sin
 * bordes redondeados ni gradientes) para que se vea genuinamente retro,
 * en vez de un blob suavizado. Sin ningún asset externo.
 */

const COLS = 14;
const ROWS = 12;

// Ancho del "blob" del cuerpo por fila (columnas relativas 0-11, offset +2
// para dejar espacio a la colita de cursor en la izquierda).
const BODY_SPAN: [number, number][] = [
  [3, 8], [2, 9], [1, 10], [1, 10],
  [0, 11], [0, 11], [0, 11], [0, 11],
  [1, 10], [1, 10], [2, 9], [3, 8],
];
const BODY_OFFSET = 2;

// Colita triangular estilo puntero de mouse, esquina inferior izquierda.
const TAIL_CELLS: Array<[number, number]> = [[9, 1], [10, 0], [10, 1]];

// Ojos: bloques 2x2, columnas absolutas.
const EYES = [
  { cols: [5, 6] as [number, number], pupilCol: 6 },
  { cols: [9, 10] as [number, number], pupilCol: 9 },
];
const EYE_ROW_TOP = 4;
const EYE_ROW_BOTTOM = 5;

type Palette = { body: string; shade: string; outline: string; white: string; pupil: string };

const PALETTE: Palette = {
  body:    '#FF8A3D',
  shade:   'var(--ce-accent, #F26A1F)',
  outline: '#7A3A0F',
  white:   '#FFFFFF',
  pupil:   '#0B0B0F',
};
const PALETTE_LOCKED: Palette = {
  body: '#C9C9C0', shade: '#A6A69C', outline: '#5C5C56', white: '#FFFFFF', pupil: '#3A3A36',
};

function isBody(r: number, c: number): boolean {
  const span = BODY_SPAN[r];
  if (span && c >= span[0] + BODY_OFFSET && c <= span[1] + BODY_OFFSET) return true;
  return TAIL_CELLS.some(([tr, tc]) => tr === r && tc === c);
}

function cellColor(r: number, c: number, blink: boolean, p: Palette): string | null {
  const inEye = EYES.some((eye) => c >= eye.cols[0] && c <= eye.cols[1] && (r === EYE_ROW_TOP || r === EYE_ROW_BOTTOM));

  if (inEye) {
    if (blink) {
      // Párpado cerrado: fila de arriba vuelve al color del cuerpo,
      // fila de abajo se marca como una línea oscura — parpadeo "chunky".
      return r === EYE_ROW_TOP ? p.body : p.outline;
    }
    const eye = EYES.find((e) => c >= e.cols[0] && c <= e.cols[1]);
    if (r === EYE_ROW_BOTTOM && eye && c === eye.pupilCol) return p.pupil;
    return p.white;
  }

  if (!isBody(r, c)) return null;

  // Sombreado plano de 2 tonos (look retro) — mitad derecha/abajo más oscura.
  return c - BODY_OFFSET >= 6 || r >= 7 ? p.shade : p.body;
}

export function ClickyMascot({ size = 40, locked = false, awake = true }: {
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

  const unit = size / COLS;
  const palette = locked ? PALETTE_LOCKED : PALETTE;

  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, ${unit}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${unit}px)`,
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.18))',
      }}
    >
      {Array.from({ length: ROWS }).map((_, r) => (
        Array.from({ length: COLS }).map((__, c) => {
          const color = cellColor(r, c, blink, palette);
          return (
            <div
              key={`${r}-${c}`}
              style={{
                width: unit,
                height: unit,
                background: color ?? 'transparent',
              }}
            />
          );
        })
      ))}
    </div>
  );
}
