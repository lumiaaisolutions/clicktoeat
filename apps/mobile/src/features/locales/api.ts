import { api } from '@/core/api';
import type { LocalMini, MyLocalesResponse } from '@/lib/types';

export async function fetchMyLocales(): Promise<MyLocalesResponse> {
  const { data } = await api.get<MyLocalesResponse>('/me/locales');
  return data;
}

export async function switchLocal(localId: number): Promise<LocalMini> {
  const { data } = await api.post<{ data: LocalMini }>(`/me/switch-local/${localId}`);
  return data.data;
}
