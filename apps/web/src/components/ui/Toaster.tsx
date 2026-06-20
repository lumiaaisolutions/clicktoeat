'use client';

import { Toaster as SileoToaster } from 'sileo';

// Wrapper sobre el Toaster de Sileo con los defaults visuales del proyecto.
// Mantenemos el nombre `Toaster` para no tocar los layouts que ya lo montan
// (apps/web/src/app/admin/layout.tsx).
export function Toaster() {
  return (
    <SileoToaster
      position="bottom-right"
      theme="system"
      offset={{ bottom: 16, right: 16 }}
    />
  );
}
