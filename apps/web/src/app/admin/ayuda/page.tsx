'use client';

import Link from 'next/link';
import { useHelpCenter } from '@/store/helpCenter';
import { TOURS } from '@/components/help/tours';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon, type IconName } from '@/components/ui/Icon';
import { soporteWhatsappUrl } from '@/lib/support';
import { cn } from '@/lib/utils';

interface HelpCard {
  slug:  string;
  icon:  IconName;
  title: string;
  body:  string;
  steps: number;
}

const CARDS: HelpCard[] = [
  { slug: 'bienvenida',  icon: 'sparkles',  title: 'Bienvenida',        body: 'Cómo arrancar tu local en 5 minutos.', steps: TOURS.bienvenida?.length ?? 0 },
  { slug: 'productos',   icon: 'package',   title: 'Productos',         body: 'Crea, edita y organiza tus platillos.', steps: TOURS.productos?.length ?? 0 },
  { slug: 'categorias',  icon: 'list',      title: 'Categorías',        body: 'Agrupa tus productos por tipo.', steps: TOURS.categorias?.length ?? 0 },
  { slug: 'pedidos',     icon: 'bell',      title: 'Pedidos',           body: 'Recibe, confirma y entrega.', steps: TOURS.pedidos?.length ?? 0 },
  { slug: 'inventario',  icon: 'truck',     title: 'Inventario',        body: 'Controla tu stock de ingredientes.', steps: TOURS.inventario?.length ?? 0 },
  { slug: 'compras',     icon: 'truck',     title: 'Compras',           body: 'Registra lo que compras al proveedor.', steps: TOURS.compras?.length ?? 0 },
  { slug: 'branding',    icon: 'palette',   title: 'Branding',          body: 'Logo, colores y banner de tu landing.', steps: TOURS.branding?.length ?? 0 },
  { slug: 'qr',          icon: 'qr-code',   title: 'Código QR',         body: 'Descarga e imprime tu QR único.', steps: TOURS.qr?.length ?? 0 },
  { slug: 'horarios',    icon: 'clock',     title: 'Horarios',          body: 'Cuándo aceptas pedidos.', steps: TOURS.horarios?.length ?? 0 },
  { slug: 'staff',       icon: 'users',     title: 'Equipo',            body: 'Invita personas a ayudarte.', steps: TOURS.staff?.length ?? 0 },
  { slug: 'multi-sucursal', icon: 'store',  title: 'Multi-sucursal',     body: 'Cambia entre tus locales con un click.', steps: TOURS['multi-sucursal']?.length ?? 0 },
  { slug: 'metricas',    icon: 'chart',     title: 'Reportes',          body: 'Tus números del día.', steps: TOURS.metricas?.length ?? 0 },
  { slug: 'audit-log',   icon: 'history',   title: 'Historial',         body: 'Quién hizo qué y cuándo.', steps: TOURS['audit-log']?.length ?? 0 },
  { slug: 'billing',     icon: 'card',      title: 'Suscripción',       body: 'Plan, método de pago, facturas.', steps: TOURS.billing?.length ?? 0 },
  // F100 — features nuevas
  { slug: 'cupones-horario', icon: 'sparkles', title: 'Cupones automáticos', body: '2x1, happy hour, combo del día con horario.', steps: TOURS['cupones-horario']?.length ?? 0 },
  { slug: 'reviews',     icon: 'star',      title: 'Calificaciones',    body: 'Reseñas públicas de tus clientes.', steps: TOURS.reviews?.length ?? 0 },
  { slug: 'inventario-auto-pause', icon: 'package', title: 'Pausa automática', body: 'Productos se ocultan solos si no hay stock.', steps: TOURS['inventario-auto-pause']?.length ?? 0 },
  { slug: 'centro-aprendizaje', icon: 'sparkles', title: 'Centro de aprendizaje', body: 'Animaciones que te enseñan a usar todo.', steps: TOURS['centro-aprendizaje']?.length ?? 0 },
];

export default function AyudaPage() {
  const openTour = useHelpCenter((s) => s.openTour);
  const seen     = useHelpCenter((s) => s.seen);
  const resetAll = useHelpCenter((s) => s.resetAll);

  const hayVistos = seen.size > 0;

  const reiniciarTodos = () => {
    if (!confirm('¿Quitar el marcador de "visto" de todos los tutoriales? Los tours volverán a aparecer automáticamente al entrar a cada módulo por primera vez.')) return;
    resetAll();
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Centro de ayuda"
        kickerIcon="help"
        title="¿Cómo funciona"
        titleAccent="ClickToEat?"
        description="Recorridos guiados para cada módulo. Selecciona uno para abrir el tour interactivo con tooltips y resaltado en pantalla."
        actions={hayVistos ? (
          <button
            type="button"
            onClick={reiniciarTodos}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-line bg-white text-sm font-semibold text-ink hover:border-ink/30 transition"
            title="Limpia los marcadores 'visto' para que los tours vuelvan a aparecer al iniciar"
          >
            <Icon name="history" size={14} />
            Volver a ver los tutoriales
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => {
          const visto = seen.has(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => openTour(c.slug)}
              className={cn(
                'group relative rounded-3xl border border-line bg-white p-5 sm:p-6 text-left transition-all',
                'hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.18)] hover:border-ink/30',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 grid place-items-center shrink-0 text-amber-700">
                  <Icon name={c.icon} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="ce-display text-lg font-bold leading-tight">{c.title}</h3>
                    {visto && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <Icon name="check" size={9} />
                        Visto
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{c.body}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {c.steps} {c.steps === 1 ? 'paso' : 'pasos'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink group-hover:text-[color:var(--ce-accent,#F26A1F)] transition">
                  <Icon name="play" size={12} />
                  {visto ? 'Repetir' : 'Empezar'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer educativo: contacto humano si tour no resuelve */}
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-amber-50/40 p-6 sm:p-8 mt-8">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-white border border-line grid place-items-center shrink-0 text-emerald-600">
            <Icon name="message-circle" size={22} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Atención humana</p>
            <h3 className="ce-display text-xl font-bold mt-1">¿No encuentras lo que buscas?</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Escríbenos por WhatsApp y te respondemos. Sin bots.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            <Link
              href="/admin/ayuda/contactar"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 transition tap-target"
            >
              <Icon name="message-circle" size={16} />
              Abrir ticket
            </Link>
            <a
              href={soporteWhatsappUrl({
                motivo: 'Necesito ayuda con mi panel de ClickToEat',
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition tap-target"
            >
              <Icon name="whatsapp" size={16} />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
