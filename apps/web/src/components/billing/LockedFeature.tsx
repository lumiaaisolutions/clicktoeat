'use client';

import { usePlan } from '@/store/plan';
import { UpgradeCard } from './UpgradeCard';

interface Props {
  /** Feature key tal como vive en App\Support\Features (PHP). Importable desde `@/store/plan` Features. */
  feature: string;
  /** Plan mínimo requerido — solo para display, no se valida acá. */
  requiredPlan: 'professional' | 'premium';
  /** Título que aparece en el overlay bloqueado. */
  title: string;
  /** Cuerpo opcional del overlay. */
  body?: string;
  /** El contenido real, que se renderiza si la feature está activa.
   *  Si no, se renderiza blureado como teaser detrás del overlay. */
  children: React.ReactNode;
}

/**
 * Envoltorio que decide entre mostrar el contenido real o un overlay
 * "bloqueado" con CTA para subir de plan. La estrategia es VISIBLE
 * teaser (blur + opacity 60%) en lugar de ocultar — crea deseo de upgrade.
 */
export function LockedFeature({ feature, requiredPlan, title, body, children }: Props) {
  const hasFeature = usePlan((s) => s.has(feature));

  if (hasFeature) return <>{children}</>;

  return (
    <div className="relative min-h-[400px]">
      <div className="filter blur-sm pointer-events-none select-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-white/40 backdrop-blur">
        <UpgradeCard title={title} requiredPlan={requiredPlan} body={body} />
      </div>
    </div>
  );
}
