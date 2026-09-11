/**
 * Caja explicativa "para qué sirve" — texto en lenguaje simple que aparece
 * arriba de un creador/editor para que cualquier usuario entienda el concepto.
 */
import { Icon } from './Icon';

export function InfoBox({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={'rounded-xl bg-[#F26A1F]/[0.07] border border-[#F26A1F]/25 px-3.5 py-2.5 text-sm text-ink/80 flex gap-2 items-start ' + className}>
      <Icon name="lightbulb" size={16} className="shrink-0 mt-0.5 text-[#F26A1F]" />
      <span>{children}</span>
    </div>
  );
}
