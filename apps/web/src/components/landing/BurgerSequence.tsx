'use client';

import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useSpring,
} from 'framer-motion';

/**
 * Image-sequence scrubbing tipo Apple. 168 frames JPG de hamburguesa armándose
 * conforme el usuario scrollea por toda la landing page.
 *
 * Diseño:
 * - Canvas fixed a la derecha del viewport (50% width en desktop).
 * - Pre-load total: ~4.3 MB. Se hace en paralelo en useEffect inicial.
 * - useScroll() global del documento → frameIndex 0..167.
 * - useSpring suaviza el cambio para que el scrub se sienta fluido aunque el
 *   usuario tire del trackpad en saltos discretos.
 * - Fade-out al acercarse al footer (scroll > 90%).
 * - Oculto en mobile (`hidden lg:block`) — 4.3 MB es demasiado para conexiones
 *   móviles, y el viewport es muy angosto para que se vea bien.
 *
 * Performance:
 * - Una vez cargados, redibujar es solo `drawImage` — < 1 ms por frame.
 * - useMotionValueEvent dispara el redraw fuera del ciclo de React (no causa
 *   re-renders).
 */

const TOTAL_FRAMES = 168;
const FRAME_PATH = (i: number) =>
  `/frames/burger/ezgif-frame-${String(i + 1).padStart(3, '0')}.jpg`;

export function BurgerSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [firstReady, setFirstReady] = useState(false);

  // Pre-load todos los frames en paralelo.
  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = FRAME_PATH(i);
      img.onload = () => {
        if (cancelled) return;
        setLoadedCount((c) => c + 1);
        if (i === 0) {
          setFirstReady(true);
          drawFrame(0);
        }
      };
      imgs.push(img);
    }
    imagesRef.current = imgs;

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize canvas al device pixel ratio (sharp en HiDPI).
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx?.scale(dpr, dpr);
      // Redraw current frame at new size
      const cur = imagesRef.current[currentIndex.current];
      if (cur?.complete) drawImage(cur);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const currentIndex = useRef(0);

  function drawImage(img: HTMLImageElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    // Cover fit — la imagen llena el canvas manteniendo proporción.
    const imgRatio = img.width / img.height;
    const canvasRatio = w / h;
    let drawW: number, drawH: number, dx: number, dy: number;
    if (imgRatio > canvasRatio) {
      drawH = h;
      drawW = h * imgRatio;
      dx = (w - drawW) / 2;
      dy = 0;
    } else {
      drawW = w;
      drawH = w / imgRatio;
      dx = 0;
      dy = (h - drawH) / 2;
    }
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }

  function drawFrame(index: number) {
    const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.floor(index)));
    const img = imagesRef.current[clamped];
    if (!img || !img.complete) {
      // Si el frame objetivo aún no cargó, intentar dibujar el frame cargado
      // más cercano para evitar pantalla en blanco.
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const back = imagesRef.current[clamped - offset];
        if (back?.complete) { drawImage(back); return; }
        const fwd  = imagesRef.current[clamped + offset];
        if (fwd?.complete) { drawImage(fwd); return; }
      }
      return;
    }
    currentIndex.current = clamped;
    drawImage(img);
  }

  // Scroll del documento — la secuencia se anima durante la zona "antes del
  // catálogo de cards" (Hero → NearbySection → Favoritos → Catálogo). Las
  // secciones full-width que vienen después (WhyClickToEat, SystemPreview,
  // CTA Owner, QR) cubren el canvas con su fondo, así que el frame se queda
  // congelado en el último estado y el canvas se desvanece para no competir.
  const { scrollYProgress } = useScroll();
  const rawIndex = useTransform(scrollYProgress, [0.01, 0.34], [0, TOTAL_FRAMES - 1]);
  const smoothIndex = useSpring(rawIndex, { stiffness: 120, damping: 28, mass: 0.4 });

  useMotionValueEvent(smoothIndex, 'change', (v) => {
    drawFrame(v);
  });

  // Opacity:
  //  0.00 → 0.03  fade-in (0.85 → 1)
  //  0.03 → 0.34  full visible (la animación corre)
  //  0.34 → 0.42  fade-out cuando empiezan las secciones full-width
  //  0.42 → 1.00  invisible
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.03, 0.34, 0.42],
    [0.85, 1, 1, 0],
  );

  // Ocultar canvas si el primer frame no ha cargado (evita flash blanco).
  const visualOpacity = firstReady ? opacity : 0;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-y-0 right-0 z-0 hidden lg:block"
      style={{ width: '50vw' }}
      aria-hidden
    >
      {/* Mask gradient izquierdo para fundir con el contenido */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 100%)',
        }}
      >
        <motion.canvas
          ref={canvasRef}
          style={{ opacity: visualOpacity, width: '100%', height: '100%' }}
          className="block"
        />
      </div>

      {/* Tint sutil para que la hamburguesa se sienta integrada con la paleta */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,250,247,0.10) 0%, transparent 30%, transparent 70%, rgba(250,250,247,0.20) 100%)',
        }}
      />

      {/* Loader sutil mientras precargan los frames (solo se ve si tarda >0.5s) */}
      {loadedCount < TOTAL_FRAMES && (
        <div className="absolute bottom-4 right-4 text-[10px] text-muted/50 tabular-nums font-medium">
          {Math.round((loadedCount / TOTAL_FRAMES) * 100)}%
        </div>
      )}
    </div>
  );
}
