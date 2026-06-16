'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BrandingEditor } from '@/components/admin/BrandingEditor';
import { Icon } from '@/components/ui/Icon';

/**
 * Branding desde el super admin: reusa el mismo editor que ve el owner,
 * apuntando los endpoints a /admin/locales/{id}. Así toda mejora del editor
 * (templates, fuentes, colores granulares, preview) aplica para los dos.
 */
export default function SuperBrandingPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  if (!id || Number.isNaN(id)) {
    return <p className="text-sm text-red-600">ID de local inválido.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb back */}
      <Link
        href="/admin/locales"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink px-2 py-1 rounded-lg hover:bg-line/40 transition w-fit"
      >
        <Icon name="arrow-right" size={12} className="rotate-180" />
        Volver a locales
      </Link>

      <BrandingEditor localId={id} />
    </div>
  );
}
