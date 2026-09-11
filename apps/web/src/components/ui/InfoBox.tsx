/**
 * Caja explicativa "para qué sirve" — texto en lenguaje simple que aparece
 * arriba de un creador/editor para que cualquier usuario entienda el concepto.
 */
export function InfoBox({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={'rounded-xl bg-[#F26A1F]/[0.07] border border-[#F26A1F]/25 px-3.5 py-2.5 text-sm text-ink/80 flex gap-2 items-start ' + className}>
      <span aria-hidden className="shrink-0">💡</span>
      <span>{children}</span>
    </div>
  );
}
