'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { HelpButton } from '@/components/help/HelpButton';

interface AdminPageHeaderProps {
  /** Etiqueta pequeña uppercase con icono accent, arriba del título. */
  kicker: string;
  /** Icono del kicker. */
  kickerIcon?: IconName;
  /** Primera línea del título — peso máximo, color ink. */
  title: string;
  /** Segunda línea opcional — se renderiza con gradient ce-accent → naranja. */
  titleAccent?: string;
  /** Subtítulo descriptivo, en muted. Una frase corta. */
  description?: string;
  /** Slot derecho para CTAs (botón guardar, nuevo, etc). */
  actions?: React.ReactNode;
  /** Si está, el botón "?" del tour usa este slug. Si no se pasa, se omite. */
  tourSlug?: string;
}

/**
 * Header reusable para CADA módulo del admin. Estilo "branding hero":
 *  - Card con border-radius xl, fondo blanco con gradient sutil radial
 *  - Kicker pequeño uppercase con icono accent
 *  - Título grande Bricolage Grotesque — segunda línea opcional en gradient
 *  - Descripción muted en 1 línea
 *  - Slot de actions a la derecha (responsive: abajo en mobile)
 *  - Botón flotante "?" para abrir tour si hay tourSlug
 *
 * Ver `docs/frontend/admin.md` para uso.
 */
export function AdminPageHeader({
  kicker, kickerIcon = 'sparkles', title, titleAccent, description, actions, tourSlug,
}: AdminPageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative rounded-3xl border border-line bg-white overflow-hidden mb-6 sm:mb-8 shadow-soft"
    >
      {/* Gradient orbs decorativos sutiles */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(circle at 88% 0%, rgba(255,45,45,0.10), transparent 40%),' +
            'radial-gradient(circle at 100% 90%, rgba(255,166,45,0.13), transparent 38%),' +
            'radial-gradient(circle at 5% 100%, rgba(16,185,129,0.06), transparent 38%)',
        }}
      />

      <div className="relative grid lg:grid-cols-[1fr_auto] gap-5 sm:gap-6 lg:gap-8 items-end p-5 sm:p-7 md:p-9">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] inline-flex items-center gap-2 text-muted">
            <Icon name={kickerIcon} size={14} className="text-[color:var(--ce-accent,#FF2D2D)]" />
            {kicker}
          </p>
          <h1 className="ce-display mt-3 text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.02] tracking-tight">
            {title}
            {titleAccent && (
              <>
                <br />
                <span className="gradient-text">{titleAccent}</span>
              </>
            )}
          </h1>
          {description && (
            <p className="mt-3 text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {(actions || tourSlug) && (
          <div className="flex items-center gap-2 shrink-0 self-start lg:self-end">
            {tourSlug && <HelpButton tourSlug={tourSlug} />}
            {actions}
          </div>
        )}
      </div>
    </motion.header>
  );
}
