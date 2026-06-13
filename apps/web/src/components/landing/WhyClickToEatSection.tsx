'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * Sección "Por qué ClickToEat".
 *
 * Diseño editorial con numeración 01–04, paleta sobria (sin background ink
 * saturado), scroll-staggered fade+rise, divider lines y un kicker discreto.
 *
 * Las 4 cards son una grid 2x2 en desktop, stack en móvil. La columna izquierda
 * lleva el título grande con un sub-headline que se desliza en sync.
 */

interface Feature {
  number: string;
  icon: IconName;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    number: '01',
    icon: 'message-circle',
    title: 'Pedidos por WhatsApp',
    desc: 'El cliente abre WhatsApp con el mensaje pre-armado. Tú confirmas y entregas. Cero fricción.',
  },
  {
    number: '02',
    icon: 'zap',
    title: 'Sin app, sin cuenta',
    desc: 'El cliente entra, elige, pide. No descarga nada, no se registra. Convierte más.',
  },
  {
    number: '03',
    icon: 'shield',
    title: '0% de comisiones',
    desc: 'El dinero del pedido es tuyo, completo. Sin intermediarios entre tú y tu cliente.',
  },
  {
    number: '04',
    icon: 'qr-code',
    title: 'QR para tu local',
    desc: 'Imprime tu QR único y ponlo en barra, mesa o vitrina. Cada pedido entra a tu panel.',
  },
];

export function WhyClickToEatSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const headlineY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section ref={ref} className="relative bg-white border-y border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 grid lg:grid-cols-12 gap-12">
        {/* Columna izquierda: kicker + headline */}
        <motion.div
          style={{ y: headlineY }}
          className="lg:col-span-5 lg:sticky lg:top-24 self-start"
        >
          <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
            <span className="w-6 h-px bg-ink/40" />
            Por qué ClickToEat
          </p>
          <h2 className="ce-display mt-5 text-4xl sm:text-5xl md:text-6xl font-bold leading-[1] tracking-tight">
            Pensado para el local,<br />
            <span className="text-ink/40">construido para</span><br />
            <span className="text-ink/40">el</span> cliente.
          </h2>
          <p className="mt-6 text-base text-muted max-w-md leading-relaxed">
            Cuatro decisiones de diseño que separan a ClickToEat de cualquier app de
            delivery. Sin tarifas escondidas, sin secuestro de tu cliente.
          </p>
        </motion.div>

        {/* Columna derecha: cards editorial */}
        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-px bg-line rounded-2xl overflow-hidden">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
      className="group relative bg-white p-8 sm:p-9 min-h-[260px] flex flex-col"
    >
      {/* Número editorial */}
      <span className="ce-display text-sm font-medium text-muted tracking-widest">
        {feature.number}
      </span>

      {/* Icono — sutil, accent solo on hover */}
      <div className="mt-6 relative w-11 h-11">
        <span className="absolute inset-0 rounded-2xl border border-line transition group-hover:border-ink/30" />
        <span className="absolute inset-0 grid place-items-center text-ink/80 transition group-hover:text-ink">
          <Icon name={feature.icon} size={18} />
        </span>
      </div>

      <h3 className="ce-display text-2xl font-bold mt-6 leading-tight">{feature.title}</h3>
      <p className="text-sm text-muted mt-2 leading-relaxed flex-1">{feature.desc}</p>

      {/* Línea inferior que crece on hover */}
      <span
        aria-hidden
        className="absolute left-8 right-8 bottom-6 h-px bg-ink/0 group-hover:bg-ink/15 transition-colors"
      />
    </motion.article>
  );
}
