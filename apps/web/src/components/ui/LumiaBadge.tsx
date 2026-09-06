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
      <svg viewBox="0 0 100 112" width="22" height="24" aria-hidden className="shrink-0 transition-transform duration-300 group-hover:scale-110">
        <defs>
          <linearGradient id="lumia-badge-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
        <g stroke="url(#lumia-badge-grad)" strokeWidth="3.4" strokeLinecap="round" fill="none">
          <line x1="46" y1="18" x2="16" y2="44" />
          <line x1="46" y1="18" x2="80" y2="50" />
          <line x1="16" y1="44" x2="44" y2="94" />
          <line x1="80" y1="50" x2="44" y2="94" />
          <line x1="16" y1="44" x2="46" y2="56" />
          <line x1="46" y1="56" x2="44" y2="94" />
        </g>
        <circle cx="46" cy="18" r="7" fill="url(#lumia-badge-grad)" />
        <circle cx="16" cy="44" r="8" fill="url(#lumia-badge-grad)" />
        <circle cx="46" cy="56" r="4" fill="url(#lumia-badge-grad)" />
        <circle cx="80" cy="50" r="7.5" fill="none" stroke="url(#lumia-badge-grad)" strokeWidth="4" />
        <circle cx="44" cy="94" r="9.5" fill="none" stroke="url(#lumia-badge-grad)" strokeWidth="4.5" />
      </svg>
      <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Desarrollado por</span>
      <span className="text-sm font-extrabold tracking-wide whitespace-nowrap bg-gradient-to-r from-[#7C5CF6] to-[#4FA3F7] bg-clip-text text-transparent">
        LUMIA
      </span>
    </a>
  );
}
