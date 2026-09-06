/**
 * Badge "Desarrollado por LUMIA" — píldora con la constelación de LUMIA y el
 * wordmark en gradiente. Enlaza a lumiaaisolutions.com (publicidad de la marca).
 * Idéntico en ClickToEat y ClickToShop: es el crédito de LUMIA, no del producto.
 */
export function LumiaBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href="https://lumiaaisolutions.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Desarrollado por LUMIA — software con inteligencia artificial"
      className={
        'group inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 ' +
        'shadow-[0_2px_14px_rgba(16,16,40,0.10)] ring-1 ring-black/[0.06] ' +
        'transition-all duration-300 hover:-translate-y-0.5 ' +
        'hover:shadow-[0_6px_22px_rgba(124,92,246,0.28)] hover:ring-[#7C5CF6]/30 ' +
        className
      }
    >
      {/* Icono oficial de LUMIA (public/lumia-icon.png). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/lumia-icon.png"
        alt=""
        width={22}
        height={24}
        aria-hidden
        className="shrink-0 h-6 w-auto transition-transform duration-300 group-hover:scale-110"
      />
      <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Desarrollado por</span>
      <span className="text-sm font-extrabold tracking-wide whitespace-nowrap bg-gradient-to-r from-[#7C5CF6] to-[#4FA3F7] bg-clip-text text-transparent">
        LUMIA
      </span>
    </a>
  );
}
