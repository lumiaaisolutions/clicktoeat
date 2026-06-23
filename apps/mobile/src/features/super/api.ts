import { api } from '@/core/api';
import type { AnuncioGlobal, LocalFull, Paginated, Resource, SaasMetrics } from '@/lib/types';

export async function fetchAllLocales(q?: string): Promise<Paginated<LocalFull>> {
  const { data } = await api.get<Paginated<LocalFull>>('/admin/locales', { params: { q } });
  return data;
}

export async function suspenderLocal(id: number): Promise<LocalFull> {
  const { data } = await api.post<Resource<LocalFull>>(`/admin/locales/${id}/suspender`);
  return data.data;
}

export async function reactivarLocal(id: number): Promise<LocalFull> {
  const { data } = await api.post<Resource<LocalFull>>(`/admin/locales/${id}/reactivar`);
  return data.data;
}

export async function fetchSaasMetrics(): Promise<SaasMetrics> {
  const { data } = await api.get<SaasMetrics>('/admin/saas-metrics');
  return data;
}

export async function fetchAnunciosGlobales(): Promise<AnuncioGlobal[]> {
  const { data } = await api.get<{ data: AnuncioGlobal[] }>('/admin/anuncios');
  return data.data;
}
