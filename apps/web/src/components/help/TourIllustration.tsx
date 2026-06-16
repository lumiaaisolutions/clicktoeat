'use client';

import { motion } from 'framer-motion';

/**
 * Ilustraciones SVG animadas para los tours del admin. Cada `name` produce
 * una mini-escena de ~280x140 que se renderiza dentro del tooltip del tour.
 * Sin assets externos — todo es SVG inline para que cargue al instante.
 */
export type TourIllustrationName =
  | 'menu'
  | 'pedido'
  | 'qr'
  | 'colores'
  | 'inventario'
  | 'staff'
  | 'horarios'
  | 'metricas';

export function TourIllustration({ name }: { name: TourIllustrationName }) {
  switch (name) {
    case 'menu':       return <MenuIllustration />;
    case 'pedido':     return <PedidoIllustration />;
    case 'qr':         return <QrIllustration />;
    case 'colores':    return <ColoresIllustration />;
    case 'inventario': return <InventarioIllustration />;
    case 'staff':      return <StaffIllustration />;
    case 'horarios':   return <HorariosIllustration />;
    case 'metricas':   return <MetricasIllustration />;
    default:           return null;
  }
}

/* ─────────── Escenas ─────────── */

function MenuIllustration() {
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32">
      <rect x="20" y="22" width="240" height="96" rx="14" fill="#fff" stroke="#E5E7EB" />
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.18, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <rect x={36} y={36 + i * 24} width={36} height={16} rx={4} fill="#FEF3C7" />
          <rect x={82} y={38 + i * 24} width={120 - i * 12} height={4} rx={2} fill="#0B0B0F" opacity={0.75} />
          <rect x={82} y={46 + i * 24} width={60} height={3} rx={1.5} fill="#9CA3AF" />
          <rect x={222} y={36 + i * 24} width={26} height={16} rx={4} fill="#FF2D2D" />
        </motion.g>
      ))}
    </svg>
  );
}

function PedidoIllustration() {
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32">
      {/* Phone */}
      <rect x="36" y="14" width="84" height="112" rx="14" fill="#0B0B0F" />
      <rect x="42" y="22" width="72" height="96" rx="6" fill="#fff" />
      <rect x="50" y="32" width="56" height="6" rx="3" fill="#FF2D2D" />
      <rect x="50" y="44" width="40" height="4" rx="2" fill="#0B0B0F" opacity={0.7} />
      <rect x="50" y="54" width="56" height="22" rx="6" fill="#25D366" />
      <text x="78" y="69" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">WhatsApp</text>

      {/* Flecha animada */}
      <motion.g
        initial={{ x: 0, opacity: 0 }}
        animate={{ x: 12, opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        <path d="M138 70 L166 70" stroke="#FF2D2D" strokeWidth={3} strokeLinecap="round" />
        <path d="M158 62 L168 70 L158 78" stroke="#FF2D2D" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </motion.g>

      {/* Notificación */}
      <motion.g
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 12 }}
      >
        <rect x="184" y="44" width="76" height="52" rx="10" fill="#fff" stroke="#FF2D2D" strokeWidth={2} />
        <circle cx="200" cy="60" r="6" fill="#FF2D2D" />
        <text x="200" y="63" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="900">!</text>
        <rect x="212" y="56" width="42" height="4" rx="2" fill="#0B0B0F" />
        <rect x="192" y="74" width="60" height="3" rx="1.5" fill="#9CA3AF" />
        <rect x="192" y="82" width="44" height="3" rx="1.5" fill="#9CA3AF" />
      </motion.g>
    </svg>
  );
}

function QrIllustration() {
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32">
      <rect x="60" y="14" width="100" height="112" rx="12" fill="#fff" stroke="#E5E7EB" />
      <rect x="68" y="22" width="84" height="20" fill="#FF2D2D" />
      <text x="110" y="36" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="800">TU LOCAL</text>
      {/* QR mock */}
      <g transform="translate(76,50)">
        {Array.from({ length: 7 }).map((_, r) =>
          Array.from({ length: 7 }).map((_, c) => {
            const on = (r * 7 + c * 3 + r * c) % 3 === 0;
            return on ? <rect key={`${r}-${c}`} x={c * 10} y={r * 10} width={8} height={8} fill="#0B0B0F" /> : null;
          }),
        )}
        {/* Esquinas QR */}
        {[[0, 0], [0, 50], [50, 0]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <rect width={20} height={20} fill="#0B0B0F" />
            <rect x={3} y={3} width={14} height={14} fill="#fff" />
            <rect x={6} y={6} width={8} height={8} fill="#0B0B0F" />
          </g>
        ))}
      </g>

      {/* Onda de escaneo */}
      <motion.line
        x1="60" x2="160"
        y1="50" y2="50"
        stroke="#FF2D2D" strokeWidth={2}
        animate={{ y1: [50, 120, 50], y2: [50, 120, 50] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Mano con celular */}
      <motion.g
        initial={{ x: 0, opacity: 0.85 }}
        animate={{ x: -6, opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        <rect x="190" y="36" width="50" height="80" rx="8" fill="#0B0B0F" />
        <rect x="194" y="40" width="42" height="72" rx="3" fill="#FF2D2D" opacity={0.15} />
        <text x="215" y="80" textAnchor="middle" fontSize="22">📱</text>
      </motion.g>
    </svg>
  );
}

function ColoresIllustration() {
  const swatches = ['#FF2D2D', '#16A34A', '#1E3A8A', '#D97706', '#0B0B0F'];
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32">
      <rect x="18" y="42" width="244" height="64" rx="14" fill="#FAFAF7" stroke="#E5E7EB" />
      {swatches.map((c, i) => (
        <motion.circle
          key={c}
          cx={50 + i * 45} cy={74} r={18}
          fill={c}
          initial={{ scale: 0, y: -10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 260, damping: 14 }}
        />
      ))}
      <motion.circle
        cx={50} cy={74} r={22}
        fill="none"
        stroke="#0B0B0F" strokeWidth={2.5}
        animate={{ cx: [50, 95, 140, 185, 230, 50] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

function InventarioIllustration() {
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32">
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.2, duration: 0.5 }}
        >
          <rect x={32 + i * 76} y={32} width={64} height={76} rx={6} fill="#FEF3C7" stroke="#92400E" />
          <rect x={40 + i * 76} y={42} width={48} height={6} rx={2} fill="#92400E" />
          {/* Nivel de stock */}
          <rect x={40 + i * 76} y={58} width={48} height={42} rx={2} fill="#fff" />
          <motion.rect
            x={40 + i * 76}
            width={48} rx={2}
            fill={i === 1 ? '#DC2626' : '#16A34A'}
            initial={{ y: 100, height: 0 }}
            animate={{ y: i === 1 ? 88 : 64, height: i === 1 ? 12 : 36 }}
            transition={{ delay: 0.45 + i * 0.15, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </motion.g>
      ))}
    </svg>
  );
}

function StaffIllustration() {
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32">
      {[
        { x: 70,  color: '#FF2D2D' },
        { x: 140, color: '#16A34A' },
        { x: 210, color: '#1E3A8A' },
      ].map(({ x, color }, i) => (
        <motion.g
          key={i}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.18, type: 'spring', stiffness: 260, damping: 14 }}
        >
          <circle cx={x} cy={58} r={18} fill={color} />
          <rect x={x - 22} y={80} width={44} height={28} rx={10} fill={color} opacity={0.5} />
        </motion.g>
      ))}
    </svg>
  );
}

function HorariosIllustration() {
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32">
      <circle cx={140} cy={70} r={48} fill="#fff" stroke="#0B0B0F" strokeWidth={3} />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 140 + Math.cos(angle) * 42;
        const y1 = 70 + Math.sin(angle) * 42;
        const x2 = 140 + Math.cos(angle) * 46;
        const y2 = 70 + Math.sin(angle) * 46;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0B0B0F" strokeWidth={1.5} />;
      })}
      <motion.line
        x1={140} y1={70} x2={140} y2={34}
        stroke="#FF2D2D" strokeWidth={3} strokeLinecap="round"
        style={{ originX: '140px', originY: '70px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.line
        x1={140} y1={70} x2={140} y2={44}
        stroke="#0B0B0F" strokeWidth={2.5} strokeLinecap="round"
        style={{ originX: '140px', originY: '70px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <circle cx={140} cy={70} r={4} fill="#0B0B0F" />
    </svg>
  );
}

function MetricasIllustration() {
  const bars = [40, 70, 28, 92, 60, 80, 50];
  return (
    <svg viewBox="0 0 280 140" className="w-full h-32">
      <line x1={24} y1={118} x2={256} y2={118} stroke="#0B0B0F" strokeWidth={1.5} />
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={32 + i * 32} width={20} rx={3}
          fill={i === 3 ? '#FF2D2D' : '#0B0B0F'}
          initial={{ y: 118, height: 0 }}
          animate={{ y: 118 - h, height: h }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        />
      ))}
    </svg>
  );
}
