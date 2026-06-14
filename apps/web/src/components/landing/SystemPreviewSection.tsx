'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';

/**
 * "Tu sistema, no solo tu menú" — sección de imagen + texto que muestra el
 * panel admin como un mockup de browser. Hace parallax + grain + gradient sutil.
 *
 * El mockup es 100% SVG/HTML (no imagen externa). Eso permite mantenerlo
 * sincronizado con el panel real sin re-exportar PNGs cada vez que se rediseña.
 */
export function SystemPreviewSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const mockupY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const mockupScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 1.02]);

  return (
    <section ref={ref} className="relative bg-[color:var(--ce-bg)] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Lado izquierdo: texto */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
            <span className="w-6 h-px bg-ink/40" />
            Tu panel de control
          </p>
          <h2 className="ce-display mt-5 text-4xl sm:text-5xl md:text-6xl font-bold leading-[1] tracking-tight">
            Un sistema,<br />
            <span className="text-ink/40">no solo</span> un menú.
          </h2>
          <p className="mt-6 text-base text-muted max-w-sm leading-relaxed">
            Todo en un panel sin manual.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: 'bell' as const,        title: 'Pedidos en vivo',     desc: 'Alerta cuando llega uno nuevo.' },
              { icon: 'truck' as const,       title: 'Inventario auto',     desc: 'Cada venta descuenta sola.' },
              { icon: 'sparkles' as const,    title: 'Métricas del día',    desc: 'Ventas, ticket, top productos.' },
              { icon: 'storefront' as const,  title: 'Catálogo con extras', desc: 'Variantes y modificadores.' },
            ].map((row, i) => (
              <motion.li
                key={row.title}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="flex items-start gap-3"
              >
                <span className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-white border border-line grid place-items-center text-ink/80">
                  <Icon name={row.icon} size={14} />
                </span>
                <div>
                  <p className="text-sm font-medium leading-tight">{row.title}</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{row.desc}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Lado derecho: browser mockup con parallax */}
        <motion.div style={{ y: mockupY, scale: mockupScale }} className="relative">
          {/* Glow sutil debajo */}
          <div
            aria-hidden
            className="absolute -inset-12 rounded-[3rem] opacity-50 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(11,11,15,0.08), transparent 60%)',
            }}
          />
          <BrowserMockup />
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────── Browser mockup (panel admin) ─────────── */

function BrowserMockup() {
  return (
    <div className="relative rounded-2xl border border-line bg-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)] overflow-hidden">
      {/* Barra del browser */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-line bg-[color:var(--ce-bg)]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex-1 max-w-xs h-5 rounded bg-white border border-line flex items-center px-2 text-[9px] text-muted">
          tudominio.com/admin
        </div>
      </div>

      <div className="grid grid-cols-12 min-h-[360px] text-[10px]">
        {/* Sidebar — oculta en mobile (apretado, no aporta) */}
        <aside className="hidden sm:block col-span-3 border-r border-line bg-[color:var(--ce-bg)] p-3 space-y-1">
          <div className="ce-display font-bold text-[12px] mb-3">Click<span className="opacity-50">To</span>Eat</div>
          {['Pedidos', 'Productos', 'Inventario', 'Compras', 'Métricas', 'Branding', 'QR', 'Staff'].map((item, i) => (
            <div
              key={item}
              className={`px-2 py-1.5 rounded-md flex items-center gap-1.5 ${i === 0 ? 'bg-ink text-white font-medium' : 'text-ink/70 hover:bg-line/40'}`}
            >
              <span className="w-1 h-1 rounded-full bg-current opacity-50" />
              {item}
            </div>
          ))}
        </aside>

        {/* Main — ocupa todo el ancho en mobile */}
        <main className="col-span-12 sm:col-span-9 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="ce-display font-bold text-[14px]">Pedidos de hoy</div>
              <div className="text-muted text-[9px] mt-0.5">12 pedidos · $ 1,840 vendidos</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg border border-line grid place-items-center text-ink/70">
                <Icon name="bell" size={11} />
              </div>
              <div className="w-7 h-7 rounded-lg bg-ink text-white grid place-items-center">
                <Icon name="plus" size={11} />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Hoy',     value: '$ 1,840', acc: '+12%', acccolor: 'text-emerald-600' },
              { label: 'Pedidos', value: '12',      acc: '+3',   acccolor: 'text-emerald-600' },
              { label: 'Ticket',  value: '$ 153',   acc: '-2%',  acccolor: 'text-muted' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-line bg-white p-2">
                <div className="text-[8px] text-muted uppercase tracking-wider">{s.label}</div>
                <div className="ce-display font-bold text-[14px] mt-0.5">{s.value}</div>
                <div className={`text-[8px] mt-0.5 ${s.acccolor}`}>{s.acc}</div>
              </div>
            ))}
          </div>

          {/* Tabla pedidos */}
          <div className="mt-3 rounded-lg border border-line overflow-hidden">
            <div className="grid grid-cols-12 px-2 py-1.5 bg-[color:var(--ce-bg)] text-[8px] uppercase tracking-wider text-muted font-medium">
              <div className="col-span-3">Pedido</div>
              <div className="col-span-3">Cliente</div>
              <div className="col-span-3">Total</div>
              <div className="col-span-3">Estado</div>
            </div>
            {[
              { id: '#A-128', name: 'Fer Torres',    total: '$ 54',  status: 'Nuevo',     col: 'bg-amber-100 text-amber-800' },
              { id: '#A-127', name: 'María L.',      total: '$ 132', status: 'En camino', col: 'bg-blue-100 text-blue-800' },
              { id: '#A-126', name: 'Luis Hdz.',     total: '$ 89',  status: 'Entregado', col: 'bg-emerald-100 text-emerald-800' },
              { id: '#A-125', name: 'Ana P.',        total: '$ 215', status: 'Entregado', col: 'bg-emerald-100 text-emerald-800' },
            ].map((row) => (
              <div key={row.id} className="grid grid-cols-12 px-2 py-1.5 border-t border-line items-center">
                <div className="col-span-3 font-medium">{row.id}</div>
                <div className="col-span-3 text-muted">{row.name}</div>
                <div className="col-span-3 font-medium">{row.total}</div>
                <div className="col-span-3">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${row.col}`}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
