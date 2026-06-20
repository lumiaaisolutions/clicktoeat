'use client';

// Adapter sobre `sileo` para mantener la misma API pública que el toast
// store anterior (Zustand + framer-motion). Los call sites siguen usando
// `import { toast } from '@/store/toast'` y `toast.success(text)` sin
// cambios — sileo se encarga del render, el stacking, el dismiss y la
// física de las animaciones.
//
// Para opciones avanzadas (descripción larga, botón de acción, promise
// toasts) usar `sileo` directamente desde 'sileo':
//   import { sileo } from 'sileo';
//   sileo.success({ title: 'Listo', description: '...', button: { ... } });

import { sileo } from 'sileo';

export interface ToastItem {
  id: string;
  kind: 'success' | 'error' | 'info';
  text: string;
}

export const toast = {
  success: (text: string) => sileo.success({ title: text }),
  error:   (text: string) => sileo.error({   title: text }),
  info:    (text: string) => sileo.info({    title: text }),
};

// Compat shim: el código viejo importaba `useToast` para acceder a la
// lista de toasts y renderizarlos. Ahora Sileo lo hace por su cuenta,
// pero dejamos el hook como no-op para que ningún import existente
// (o futuro hecho por costumbre) se rompa.
export function useToast() {
  return {
    toasts: [] as ToastItem[],
    push(kind: ToastItem['kind'], text: string) {
      if (kind === 'error') sileo.error({ title: text });
      else if (kind === 'success') sileo.success({ title: text });
      else sileo.info({ title: text });
    },
    dismiss(_id: string) {
      // sileo gestiona dismiss internamente.
    },
  };
}
