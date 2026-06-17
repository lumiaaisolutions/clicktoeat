'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Leccion {
  slug: string;
  titulo: string;
  resumen: string;
  duracion: string;
  pasos: string[];
  cta: { href: string; label: string };
  Animacion: React.FC;
}

const LECCIONES: Leccion[] = [
  {
    slug: 'primer-producto',
    titulo: 'Cómo subir mi primer producto',
    resumen: 'En 4 pasos tienes tu menú online con foto y precio.',
    duracion: '2 min',
    pasos: [
      'Entra al menú lateral → Productos',
      'Toca "+ Nuevo producto"',
      'Llena nombre, precio y sube una foto',
      'Guarda — listo, ya aparece en tu landing pública',
    ],
    cta: { href: '/admin/productos', label: 'Ir a Productos' },
    Animacion: AnimProducto,
  },
  {
    slug: 'mover-qr',
    titulo: 'Cómo imprimir y pegar mi QR',
    resumen: 'Tu QR único para que los clientes te encuentren al instante.',
    duracion: '3 min',
    pasos: [
      'Entra al menú lateral → Código QR',
      'Toca "Descargar PNG" o "Descargar PDF"',
      'Imprime en una hoja A4 a color',
      'Pega cerca de la entrada, en la barra o en la mesa',
    ],
    cta: { href: '/admin/qr', label: 'Ir a QR' },
    Animacion: AnimQR,
  },
  {
    slug: 'happy-hour',
    titulo: 'Cómo cobrar más en horario pico',
    resumen: 'Cupones automáticos por horario — 2x1 los miércoles 5pm, combo del día, etc.',
    duracion: '3 min',
    pasos: [
      'Ve a Cupones → "+ Nuevo cupón"',
      'Llena código y descuento',
      'Activa "Horario" y elige hora inicio/fin + días',
      'Activa "Mostrar en mi landing" + elige productos sugeridos',
      'Guarda — el banner aparece auto en tu landing en el horario',
    ],
    cta: { href: '/admin/cupones', label: 'Ir a Cupones' },
    Animacion: AnimCupon,
  },
  {
    slug: 'pedido-llega',
    titulo: 'Cómo recibir pedidos con sonido',
    resumen: 'Activa las notificaciones para que suene cuando llegue un pedido nuevo.',
    duracion: '1 min',
    pasos: [
      'En tu navegador, acepta los permisos cuando aparezca el popup',
      'Verás un icono de campanita arriba — cuando entra un pedido vibra y suena',
      'Si tu local tiene tablet, déjala con tu panel abierto en /admin/pedidos',
    ],
    cta: { href: '/admin/pedidos', label: 'Ir a Pedidos' },
    Animacion: AnimBell,
  },
  {
    slug: 'invitar-equipo',
    titulo: 'Cómo invitar a mi equipo',
    resumen: 'Cuentas separadas para mesero, cocina y caja.',
    duracion: '2 min',
    pasos: [
      'Equipo → "+ Nueva cuenta de staff"',
      'Llena nombre + email + password temporal',
      'Marca los módulos a los que puede acceder',
      'Comparte el email + password con tu staff',
    ],
    cta: { href: '/admin/staff', label: 'Ir a Equipo' },
    Animacion: AnimEquipo,
  },
  {
    slug: 'recuperar-borrado',
    titulo: 'Cómo recuperar un producto borrado',
    resumen: 'Cualquier cosa que borres se queda 30 días en "Borrados" y la puedes traer de vuelta.',
    duracion: '1 min',
    pasos: [
      'Ve a Productos → filtro "Borrados"',
      'Toca el botón "↺ Restaurar" en el producto',
      'Vuelve a la lista normal',
    ],
    cta: { href: '/admin/productos', label: 'Ir a Productos' },
    Animacion: AnimRestaurar,
  },
];

export default function CentroAprendizajePage() {
  const [open, setOpen] = useState<Leccion | null>(null);

  return (
    <div>
      <AdminPageHeader
        kicker="Centro de aprendizaje"
        kickerIcon="sparkles"
        title="Aprende a usar"
        titleAccent="todo el panel."
        description="Animaciones cortas que te muestran exactamente cómo hacer cada cosa. Sin videos, sin manuales."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LECCIONES.map((l) => (
          <button
            key={l.slug}
            type="button"
            onClick={() => setOpen(l)}
            className="rounded-3xl border border-line bg-white p-5 text-left hover:border-ink/30 hover:shadow-soft transition group"
          >
            <div className="rounded-2xl bg-zinc-50 border border-line aspect-video grid place-items-center mb-3 overflow-hidden">
              <l.Animacion />
            </div>
            <h3 className="ce-display font-bold leading-tight">{l.titulo}</h3>
            <p className="text-xs text-muted mt-1 leading-snug">{l.resumen}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
              <span className="text-[11px] text-muted font-semibold uppercase tracking-wider">{l.duracion}</span>
              <span className="text-xs font-semibold text-ink group-hover:text-[color:var(--ce-accent)] transition inline-flex items-center gap-1">
                Ver lección
                <Icon name="arrow-right" size={12} />
              </span>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {open && <LeccionModal leccion={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}

function LeccionModal({ leccion, onClose }: { leccion: Leccion; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl border border-line overflow-hidden my-4"
      >
        <div className="rounded-b-3xl bg-zinc-50 border-b border-line aspect-video grid place-items-center">
          <leccion.Animacion />
        </div>
        <div className="p-6">
          <h2 className="ce-display text-2xl font-bold">{leccion.titulo}</h2>
          <p className="text-sm text-muted mt-1">{leccion.resumen}</p>

          <ol className="mt-5 space-y-2">
            {leccion.pasos.map((paso, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-ink text-white grid place-items-center text-xs font-bold">{i + 1}</span>
                <span className="text-sm leading-relaxed">{paso}</span>
              </li>
            ))}
          </ol>

          <div className="flex gap-2 mt-6">
            <Link
              href={leccion.cta.href}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 transition"
            >
              {leccion.cta.label}
              <Icon name="arrow-right" size={14} />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl border border-line text-sm font-medium hover:border-ink/30"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────── Animaciones SVG (sin assets externos) ─────────────── */

function AnimProducto() {
  return (
    <motion.svg viewBox="0 0 200 110" className="w-full h-full">
      <rect x="0" y="0" width="200" height="110" fill="#FBF8F3" />
      {/* Cursor simulado */}
      <motion.circle cx="40" cy="30" r="4" fill="#FF2D2D"
        animate={{ cx: [40, 120, 120, 120], cy: [30, 30, 70, 70] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
      {/* Sidebar */}
      <rect x="0" y="0" width="50" height="110" fill="#fff" stroke="#eee" />
      <rect x="8" y="20" width="34" height="6" rx="2" fill="#FF2D2D" />
      <rect x="8" y="32" width="30" height="4" rx="2" fill="#aaa" />
      <rect x="8" y="42" width="34" height="4" rx="2" fill="#aaa" />
      {/* Botón nuevo producto */}
      <motion.rect x="60" y="20" width="100" height="20" rx="10" fill="#0B0B0F"
        animate={{ scale: [1, 1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.5, 0.6] }} />
      <text x="68" y="33" fontSize="9" fill="#fff" fontWeight="bold">+ Nuevo producto</text>
      {/* Card que aparece */}
      <motion.g
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: [0, 0, 1, 1], y: [10, 10, 0, 0] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.55, 0.7, 1] }}
      >
        <rect x="60" y="50" width="130" height="50" rx="6" fill="#fff" stroke="#eee" />
        <rect x="65" y="55" width="40" height="40" rx="4" fill="#f5d896" />
        <rect x="110" y="60" width="60" height="6" rx="2" fill="#0B0B0F" />
        <rect x="110" y="70" width="40" height="4" rx="2" fill="#aaa" />
        <rect x="110" y="80" width="30" height="10" rx="3" fill="#FF2D2D" />
        <text x="115" y="88" fontSize="6" fill="#fff">$120</text>
      </motion.g>
    </motion.svg>
  );
}

function AnimQR() {
  return (
    <motion.svg viewBox="0 0 200 110" className="w-full h-full">
      <rect width="200" height="110" fill="#FBF8F3" />
      <motion.g
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <rect x="65" y="15" width="70" height="70" rx="6" fill="#fff" stroke="#0B0B0F" strokeWidth="2" />
        {/* Grid QR estilo */}
        {Array.from({ length: 7 }).map((_, i) =>
          Array.from({ length: 7 }).map((_, j) => {
            const filled = (i + j) % 2 === 0 || (i < 2 && j < 2) || (i < 2 && j > 4);
            return filled ? <rect key={`${i}-${j}`} x={70 + j * 9} y={20 + i * 9} width="8" height="8" fill="#0B0B0F" /> : null;
          })
        )}
      </motion.g>
      <motion.text x="100" y="100" fontSize="7" textAnchor="middle" fill="#0B0B0F" fontWeight="bold"
        animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.3, 0.7, 1] }}>
        Escanea para pedir
      </motion.text>
    </motion.svg>
  );
}

function AnimCupon() {
  return (
    <motion.svg viewBox="0 0 200 110" className="w-full h-full">
      <rect width="200" height="110" fill="#FBF8F3" />
      {/* Reloj */}
      <motion.g
        animate={{ rotate: 360 }}
        style={{ originX: '40px', originY: '30px' }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="40" cy="30" r="18" fill="none" stroke="#FF2D2D" strokeWidth="2" />
        <line x1="40" y1="30" x2="40" y2="18" stroke="#FF2D2D" strokeWidth="2" />
        <line x1="40" y1="30" x2="48" y2="30" stroke="#FF2D2D" strokeWidth="2" />
      </motion.g>
      {/* Cupón emerging */}
      <motion.g
        animate={{ opacity: [0, 1, 1], scale: [0.8, 1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <rect x="75" y="40" width="115" height="50" rx="8" fill="#fbbf24" />
        <text x="82" y="58" fontSize="11" fill="#7c2d12" fontWeight="bold">HAPPY HOUR</text>
        <text x="82" y="73" fontSize="9" fill="#7c2d12">2x1 cervezas · 5-7pm</text>
        <text x="82" y="83" fontSize="7" fill="#7c2d12" opacity="0.7">Toca para aprovechar →</text>
      </motion.g>
    </motion.svg>
  );
}

function AnimBell() {
  return (
    <motion.svg viewBox="0 0 200 110" className="w-full h-full">
      <rect width="200" height="110" fill="#FBF8F3" />
      <motion.g
        animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
        style={{ originX: '100px', originY: '50px' }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
      >
        <path d="M100,30 a16,16 0 0 0 -16,16 v12 l-4,6 h40 l-4,-6 v-12 a16,16 0 0 0 -16,-16 z" fill="#0B0B0F" />
        <circle cx="100" cy="70" r="4" fill="#0B0B0F" />
      </motion.g>
      <motion.circle cx="112" cy="34" r="5" fill="#FF2D2D"
        animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
      <text x="111" y="37" fontSize="7" fill="#fff" textAnchor="middle" fontWeight="bold">1</text>
      <motion.text x="100" y="95" fontSize="8" textAnchor="middle" fill="#0B0B0F"
        animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
        ¡Pedido nuevo!
      </motion.text>
    </motion.svg>
  );
}

function AnimEquipo() {
  return (
    <motion.svg viewBox="0 0 200 110" className="w-full h-full">
      <rect width="200" height="110" fill="#FBF8F3" />
      {[60, 100, 140].map((x, i) => (
        <motion.g key={x}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: [60, 30, 30, 30, 60], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
        >
          <circle cx={x} cy={50} r="12" fill={['#10b981', '#3b82f6', '#f59e0b'][i]} />
          <text x={x} y={54} fontSize="10" textAnchor="middle" fill="#fff" fontWeight="bold">{['J', 'M', 'A'][i]}</text>
          <text x={x} y={75} fontSize="7" textAnchor="middle" fill="#0B0B0F">{['Cocina', 'Caja', 'Mesero'][i]}</text>
        </motion.g>
      ))}
    </motion.svg>
  );
}

function AnimRestaurar() {
  return (
    <motion.svg viewBox="0 0 200 110" className="w-full h-full">
      <rect width="200" height="110" fill="#FBF8F3" />
      {/* Producto */}
      <motion.rect x="60" y="35" width="80" height="40" rx="6" fill="#fff" stroke="#eee"
        animate={{ opacity: [0.3, 0.3, 1, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
      <motion.text x="100" y="58" fontSize="9" textAnchor="middle" fill="#0B0B0F" fontWeight="bold"
        animate={{ opacity: [0.3, 0.3, 1, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
        Producto X
      </motion.text>
      {/* Trash que se va */}
      <motion.g
        animate={{ x: [0, 0, 50, 50], opacity: [1, 1, 0, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <rect x="155" y="40" width="20" height="25" rx="3" fill="#dc2626" />
        <line x1="158" y1="38" x2="172" y2="38" stroke="#fff" strokeWidth="2" />
      </motion.g>
      {/* Restore arrow */}
      <motion.path d="M30,55 a20,20 0 1 1 20,20" fill="none" stroke="#10b981" strokeWidth="3"
        animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.4, 0.8, 1] }} />
      <motion.polygon points="48,72 56,72 52,80" fill="#10b981"
        animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.4, 0.8, 1] }} />
    </motion.svg>
  );
}
