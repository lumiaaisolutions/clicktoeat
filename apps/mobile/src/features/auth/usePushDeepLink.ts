import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { playBell } from '@/core/audio';
import { useAuth } from '@/store/auth';

/**
 * Conecta los listeners de Expo Notifications con el router.
 *
 * - Notif recibida con app en foreground → suena la campana (la lista de
 *   pedidos en pantalla ya hace polling, así que solo reforzamos el aviso).
 * - Notif tapeada por el user → navegamos a `data.route` si existe.
 *
 * Solo se monta cuando hay un user autenticado para que el router no intente
 * navegar a /(admin) antes de estar dentro del grupo protegido.
 */
export function usePushDeepLink(): void {
  const user = useAuth((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const received = Notifications.addNotificationReceivedListener(() => {
      playBell();
    });

    const responded = Notifications.addNotificationResponseReceivedListener((event) => {
      const data = event.notification.request.content.data as { route?: string } | undefined;
      const route = data?.route;
      if (typeof route === 'string' && route.startsWith('/')) {
        try {
          router.push(route as never);
        } catch {
          /* ignore — ruta inválida no debe romper la app */
        }
      }
    });

    return () => {
      received.remove();
      responded.remove();
    };
  }, [user]);
}
