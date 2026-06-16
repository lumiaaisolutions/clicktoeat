'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

const LABEL: Record<string, string> = {
  professional: 'Profesional',
  premium:      'Premium',
};

export function UpgradeCard({
  title, requiredPlan, body,
}: {
  title: string;
  requiredPlan: 'professional' | 'premium';
  body?: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-white shadow-soft p-8 max-w-sm text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 grid place-items-center mx-auto">
        <Icon name="sparkles" size={20} className="text-amber-700" />
      </div>
      <h3 className="ce-display text-2xl font-bold mt-4">{title}</h3>
      <p className="text-sm text-muted mt-2">
        {body ?? <>Esta función está incluida en el plan <strong>{LABEL[requiredPlan]}</strong>.</>}
      </p>
      <Link
        href="/admin/billing"
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90 transition tap-target"
      >
        Subir a {LABEL[requiredPlan]}
        <Icon name="arrow-right" size={16} />
      </Link>
    </div>
  );
}
