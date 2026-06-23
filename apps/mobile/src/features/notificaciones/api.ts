import { api } from '@/core/api';
import type { Notificacion, NotificacionesResponse, Resource } from '@/lib/types';

export async function fetchNotificaciones(soloNoLeidas = false): Promise<NotificacionesResponse> {
  const { data } = await api.get<NotificacionesResponse>('/notificaciones', {
    params: { solo_no_leidas: soloNoLeidas ? 1 : undefined },
  });
  return data;
}

export async function marcarNotifLeida(id: number): Promise<Notificacion> {
  const { data } = await api.post<Resource<Notificacion>>(`/notificaciones/${id}/leer`);
  return data.data;
}

export async function marcarTodasLeidas(): Promise<void> {
  await api.post('/notificaciones/leer-todas');
}
