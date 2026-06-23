import { useEffect } from 'react';
import { apiEvents } from '@/core/api';
import { useAuth } from '@/store/auth';

/**
 * Conecta el bus de eventos del APIClient con el store de auth.
 * Cuando llega 401 (token expirado / revocado), forzamos logout —
 * el interceptor ya borró el token, sólo falta limpiar el user del store
 * para que `Stack.Protected` redirija a /login.
 */
export function useAuthEvents(): void {
  useEffect(() => {
    const off = apiEvents.on(async (e) => {
      if (e.code === 'UNAUTHENTICATED') {
        await useAuth.getState().logout();
      }
    });
    return off;
  }, []);
}
