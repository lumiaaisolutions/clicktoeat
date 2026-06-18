'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * Sección "Pinned Food Story" — image-sequence scrubbing con imágenes
 * reales de comida. La imagen queda fija (sticky) y los frames (imagen +
 * texto) hacen cross-fade conforme el usuario scrollea por el contenedor.
 *
 * Pattern: contenedor de 300vh con `sticky top-0 h-screen` adentro. Cada
 * frame mapea a un rango de `scrollYProgress` y se cross-fadea con
 * opacity transforms (más estable y barato que swappear nodos enteros
 * con AnimatePresence).
 *
 * Reemplaza al `ScrollPhoneSequence` técnico — los visitantes responden
 * mejor a fotos de comida que a wireframes del phone. Mantener TEXTO
 * BREVE: 6-9 palabras por título, 0-1 línea de subtítulo.
 *
 * Las imágenes vienen de Unsplash (uso comercial libre). Si el equipo
 * quiere reemplazarlas por shots propios, cambiar `image` en cada frame.
 */

interface Frame {
  image: string;
  alt: string;
  kicker: string;
  icon: IconName;
  title: string;
  body: string;
}

const FRAMES: Frame[] = [
  {
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=80',
    alt: 'Pizza recién horneada con queso fundido y albahaca fresca',
    kicker: '01 · Antojo',
    icon: 'sparkles',
    title: 'El antojo entra por la pantalla.',
    body: 'Tu menú, con foto y precio real, abierto en el celular.',
  },
  {
    image: 'https://images.unsplash.com/photo-1556745753-b2904692b3cd?auto=format&fit=crop&w=1400&q=80',
    alt: 'Persona usando WhatsApp en su teléfono',
    kicker: '02 · Pedido',
    icon: 'whatsapp',
    title: 'Un toque y va directo a tu WhatsApp.',
    body: 'Sin app que descargar, sin cuenta que crear.',
  },
  {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80',
    alt: 'Interior de un restaurante con ambiente cálido',
    kicker: '03 · Tuyo',
    icon: 'storefront',
    title: 'Cero comisiones. Cero intermediarios.',
    body: 'El pedido es de tu cliente. El dinero, todo tuyo.',
  },
];

export function PinnedFoodStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      ref={ref}
      className="relative bg-white border-y border-line"
      style={{ height: `${FRAMES.length * 110}vh` }}
      aria-label="Cómo funciona ClickToEat — historia visual"
    >
      {/* Usamos h-[100svh] (small viewport height) en lugar de h-screen para
          que iOS Safari/Chrome no rompan el cálculo cuando la URL bar
          aparece/desaparece — en h-screen la sección quedaba más alta que
          el viewport visible y el texto + imagen no entraban juntos. */}
      <div className="sticky top-0 h-[100svh] overflow-hidden flex items-center py-4 lg:py-0">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-16 items-center">
          {/* Lado texto — va PRIMERO en mobile (order-1) y derecha en desktop.
              Altura auto en mobile para que no reserve 280px vacíos cuando
              el título es corto, queda fija solo en desktop. */}
          <div className="relative order-1 lg:order-2 min-h-[180px] sm:min-h-[200px] lg:h-[420px]">
            {FRAMES.map((f, i) => (
              <FrameText key={f.title} frame={f} index={i} progress={scrollYProgress} total={FRAMES.length} />
            ))}
          </div>

          {/* Lado imagen — cross-fade entre frames con un sutil scale.
              Mobile: aspect 4/3 + max-h para que NUNCA exceda la mitad del
              viewport (antes 4/5 + sin tope hacía que la imagen midiera
              ~412px de alto y se comiera la sección). */}
          <div className="relative order-2 lg:order-1 w-full mx-auto max-w-[420px] lg:max-w-none aspect-[4/3] sm:aspect-[5/4] lg:aspect-[4/5] max-h-[45svh] lg:max-h-none rounded-3xl overflow-hidden bg-line/20 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
            {FRAMES.map((f, i) => (
              <FrameImage key={f.image} frame={f} index={i} progress={scrollYProgress} total={FRAMES.length} />
            ))}
            {/* Indicador de progreso — bar inferior */}
            <div className="absolute left-4 right-4 bottom-4 z-10 flex gap-1.5">
              {FRAMES.map((_, i) => (
                <ProgressBar key={i} index={i} total={FRAMES.length} progress={scrollYProgress} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Cada frame ocupa el rango [i/total, (i+1)/total]. Cross-fade con la
   anterior/siguiente en sus bordes — ventana de 6%. */
function frameOpacity(index: number, total: number, progress: MotionValue<number>) {
  const segment = 1 / total;
  const start = index * segment;
  const end = (index + 1) * segment;
  const fadeIn = segment * 0.18;
  return useTransform(
    progress,
    [
      Math.max(0, start - fadeIn),
      start,
      end,
      Math.min(1, end + fadeIn),
    ],
    index === 0 ? [1, 1, 1, 0] : index === total - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0],
    { clamp: true },
  );
}

function FrameImage({
  frame, index, progress, total,
}: { frame: Frame; index: number; progress: MotionValue<number>; total: number }) {
  const opacity = frameOpacity(index, total, progress);
  const segment = 1 / total;
  const scale   = useTransform(progress, [index * segment, (index + 1) * segment], [1.05, 1], { clamp: true });

  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0"
    >
      <motion.img
        src={frame.image}
        alt={frame.alt}
        loading={index === 0 ? 'eager' : 'lazy'}
        decoding="async"
        style={{ scale }}
        className="w-full h-full object-cover"
      />
      {/* Overlay sutil para mejor contraste si en mobile el texto encima
          se llegara a superponer */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent lg:hidden" />
    </motion.div>
  );
}

function FrameText({
  frame, index, progress, total,
}: { frame: Frame; index: number; progress: MotionValue<number>; total: number }) {
  const opacity = frameOpacity(index, total, progress);
  const segment = 1 / total;
  // El texto sube de 30px → 0 a la vez que aparece — feel editorial
  const y = useTransform(progress, [index * segment - segment * 0.15, index * segment], [30, 0], { clamp: true });

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col justify-center"
    >
      <p className="text-[11px] sm:text-sm font-medium uppercase tracking-[0.22em] inline-flex items-center gap-2 text-muted">
        <Icon name={frame.icon} size={14} className="text-[color:var(--ce-accent)]" />
        {frame.kicker}
      </p>
      <h2 className="ce-display mt-2 sm:mt-4 text-[26px] sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
        {frame.title}
      </h2>
      <p className="mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg text-muted max-w-md leading-relaxed">
        {frame.body}
      </p>
    </motion.div>
  );
}

function ProgressBar({
  index, total, progress,
}: { index: number; total: number; progress: MotionValue<number> }) {
  const segment = 1 / total;
  const fill = useTransform(
    progress,
    [index * segment, (index + 1) * segment],
    ['0%', '100%'],
    { clamp: true },
  );
  return (
    <div className="flex-1 h-1 rounded-full bg-white/40 overflow-hidden backdrop-blur">
      <motion.div style={{ width: fill }} className="h-full bg-white" />
    </div>
  );
}
