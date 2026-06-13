import { BrandLoader } from '@/components/ui/BrandLoader';

/**
 * Loader del root segment — Next.js lo muestra cuando hay un Server Component
 * pendiente de data fetch (ej. la home espera la lista de locales del API).
 *
 * Coexiste con InitialLoader/RouteTransition:
 *  - InitialLoader cubre la hidratación inicial (overlay z-200)
 *  - Este se monta dentro del flujo normal cuando hay Suspense activo
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[150]">
      <BrandLoader />
    </div>
  );
}
