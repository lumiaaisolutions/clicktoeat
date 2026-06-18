'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Orbs (blobs) decorativos del hero del landing. Cumplen 2 funciones:
 *
 *  1. **Float continuo** — cada orb sube/baja en loop infinito con offset
 *     distinto, dándole "vida" al hero sin ser distractivo.
 *  2. **Reacción al mouse** — cada orb se desplaza ligeramente hacia o
 *     en oposición al cursor (parallax sutil) con spring damping. En
 *     touch devices no hacemos tracking → ahorramos batería.
 *
 * Reemplaza al div estático con clase `.hero-orb` que estaba hardcoded
 * en HeroDirectory. Más interactivo, mejor sensación de profundidad.
 */
interface OrbConfig {
  color: string;
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  opacity?: number;
  /** -1 a +1 — cuánto sigue al mouse. Positivo = sigue, negativo = huye */
  follow?: number;
  /** Segundos por ciclo del float */
  floatSeconds?: number;
}

const DEFAULT_ORBS: OrbConfig[] = [
  { color: '#FF2D2D', size: 520, top: '-140px',  left: '-100px', opacity: 0.45, follow:  0.8, floatSeconds: 8 },
  { color: '#10b981', size: 360, bottom: '-140px', left: '18%',  opacity: 0.18, follow: -0.6, floatSeconds: 11 },
  { color: '#FFA62D', size: 280, top: '40%',      left: '38%',   opacity: 0.12, follow:  0.4, floatSeconds: 13 },
];

export function InteractiveOrbs({ orbs = DEFAULT_ORBS }: { orbs?: OrbConfig[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // mouseX/mouseY van de -1 a 1 (centrado en el container)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 18, mass: 1.2 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 18, mass: 1.2 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // En touch (mobile) no hacemos tracking — los orbs siguen flotando con
    // la animación CSS pero no responden al toque para ahorrar batería.
    if (window.matchMedia('(hover: none)').matches) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Normaliza a [-1, 1] usando media-pantalla como rango máximo
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      mouseX.set(Math.max(-1, Math.min(1, nx)));
      mouseY.set(Math.max(-1, Math.min(1, ny)));
    };
    const onLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
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
  // Máximo de desplazamiento por mouse (px). Más grande = más sensación de parallax.
  const range = 80;
  const x = useTransform(smoothX, (v) => v * range * follow);
  const y = useTransform(smoothY, (v) => v * range * follow);

  const floatSeconds = orb.floatSeconds ?? 9;
  // Cada orb tiene un offset distinto en el keyframe para no flotar al unísono
  const delay = idx * -2.3;

  // Wrapper externo: posiciona absoluto + traslada por mouse (transform).
  // Inner: float continuo + scale (también transform pero en el HIJO no
  // colisiona con el del wrapper). Doble capa para que ambos animations
  // coexistan sin pelearse por el mismo transform.
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
      }}
    >
      <motion.div
        animate={{
          translateY: ['0px', '-22px', '0px', '14px', '0px'],
          scale:      [1, 1.08, 1, 0.96, 1],
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
          filter: 'blur(80px)',
          willChange: 'transform',
        }}
      />
    </motion.div>
  );
}
