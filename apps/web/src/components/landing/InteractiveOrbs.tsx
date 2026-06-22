'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Orbs (blobs) decorativos del hero del landing.
 *
 * Capas:
 *  - **Wrapper (motion)**: traslada por mouse (transform x/y).
 *  - **Inner (motion)**: float infinito + scale (transform). Como vive
 *    dentro del wrapper, no colisiona con el transform del padre.
 *
 * Efectos:
 *  1. Float autónomo de 6-10s con amplitud GRANDE (±50px) y escala
 *     1 → 1.18 → 0.9 → 1 para que SIEMPRE se note movimiento, incluso
 *     sin mover el mouse.
 *  2. Parallax al cursor con `range` hasta 300px en el orb más reactivo
 *     y spring responsivo (stiffness 120, damping 18). Cada orb tiene
 *     un `follow` distinto — el rojo persigue al cursor, el verde se
 *     escapa de él, el naranja se mueve menos. La paralaxis crea una
 *     sensación de capas / profundidad.
 *  3. En touch devices (`hover: none`) no se monta el listener — los
 *     orbs siguen flotando pero no responden al toque (cero overhead).
 */
interface OrbConfig {
  color: string;
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  opacity?: number;
  /** -1.5 a +1.5 — cuánto sigue al mouse. Positivo = sigue, negativo = huye. */
  follow?: number;
  /** Segundos por ciclo del float */
  floatSeconds?: number;
  /** Amplitud del float en px (default 50) */
  floatAmplitude?: number;
}

const DEFAULT_ORBS: OrbConfig[] = [
  // Rojo grande arriba-izquierda — persigue agresivamente
  { color: '#F26A1F', size: 560, top: '-160px',  left: '-120px', opacity: 0.60, follow:  1.2, floatSeconds: 7,  floatAmplitude: 55 },
  // Verde mediano abajo-izquierda — se escapa del cursor
  { color: '#10b981', size: 380, bottom: '-160px', left: '12%',  opacity: 0.42, follow: -1.0, floatSeconds: 9,  floatAmplitude: 45 },
  // Naranja pequeño centro — se mueve poco, sigue al cursor
  { color: '#FFA62D', size: 300, top: '35%',      left: '32%',   opacity: 0.32, follow:  0.7, floatSeconds: 11, floatAmplitude: 40 },
];

export function InteractiveOrbs({ orbs = DEFAULT_ORBS }: { orbs?: OrbConfig[] }) {
  // Normalizamos el cursor al VIEWPORT (no al container) — así el efecto se
  // siente natural al mover el mouse por toda la página, no solo dentro del
  // hero. El cálculo es: (mouse - centro_viewport) / (mitad del viewport).
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 120, damping: 18, mass: 0.8 });
  const smoothY = useSpring(mouseY, { stiffness: 120, damping: 18, mass: 0.8 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // En touch (mobile) no hacemos tracking — los orbs siguen flotando con
    // el animate de framer pero no responden al toque (cero overhead).
    if (window.matchMedia('(hover: none)').matches) return;

    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Normaliza el cursor a [-1, 1] usando la mitad de la pantalla.
      const nx = (e.clientX - w / 2) / (w / 2);
      const ny = (e.clientY - h / 2) / (h / 2);
      mouseX.set(Math.max(-1, Math.min(1, nx)));
      mouseY.set(Math.max(-1, Math.min(1, ny)));
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mouseX, mouseY]);

  return (
    // Sin `overflow-hidden` aquí — el contenedor padre (HeroDirectory section)
    // ya lo tiene. Tener doble overflow recortaba el movimiento del orb más
    // de lo necesario.
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {orbs.map((orb, i) => (
        <Orb key={i} orb={orb} smoothX={smoothX} smoothY={smoothY} idx={i} />
      ))}
    </div>
  );
}

function Orb({
  orb, smoothX, smoothY, idx,
}: {
  orb: OrbConfig;
  smoothX: ReturnType<typeof useSpring>;
  smoothY: ReturnType<typeof useSpring>;
  idx: number;
}) {
  const follow = orb.follow ?? 0.5;
  // Máximo de desplazamiento por mouse (px). Más grande = más sensación de
  // parallax / profundidad. Aumentado a 200 para que el efecto sea claramente
  // visible (antes 80 ≈ apenas 10% del tamaño del orb, casi imperceptible).
  const range = 200;
  const x = useTransform(smoothX, (v) => v * range * follow);
  const y = useTransform(smoothY, (v) => v * range * follow);

  const floatSeconds   = orb.floatSeconds ?? 9;
  const floatAmplitude = orb.floatAmplitude ?? 50;
  const delay          = idx * -2.3;

  return (
    <motion.div
      style={{
        x,
        y,
        position: 'absolute',
        top: orb.top,
        left: orb.left,
        right: orb.right,
        bottom: orb.bottom,
        width: orb.size,
        height: orb.size,
        willChange: 'transform',
      }}
    >
      <motion.div
        animate={{
          // Float continuo amplio en Y + drift suave en X + respiración fuerte.
          // Más amplitud = SIEMPRE se ve algo moviéndose, aun sin tocar mouse.
          translateY: [
            '0px',
            `-${floatAmplitude}px`,
            '0px',
            `${floatAmplitude * 0.6}px`,
            '0px',
          ],
          translateX: [
            '0px',
            `${floatAmplitude * 0.4}px`,
            `-${floatAmplitude * 0.3}px`,
            '0px',
          ],
          scale: [1, 1.18, 0.92, 1.08, 1],
        }}
        transition={{
          duration: floatSeconds,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
        style={{
          width: '100%',
          height: '100%',
          background: orb.color,
          opacity: orb.opacity ?? 0.4,
          borderRadius: '9999px',
          filter: 'blur(70px)',
          willChange: 'transform',
        }}
      />
    </motion.div>
  );
}
