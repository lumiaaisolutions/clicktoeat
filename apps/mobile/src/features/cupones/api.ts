import { api } from '@/core/api';
import type { Cupon, Paginated, Resource } from '@/lib/types';

export async function fetchCupones(): Promise<Cupon[]> {
  const { data } = await api.get<Paginated<Cupon>>('/cupones');
  return data.data;
}

export async function toggleCupon(id: number): Promise<Cupon> {
  const { data } = await api.post<Resource<Cupon>>(`/cupones/${id}/toggle`);
  return data.data;
}
