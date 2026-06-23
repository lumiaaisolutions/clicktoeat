import { api } from '@/core/api';
import type { Compra, Paginated, Resource } from '@/lib/types';

export async function fetchCompras(page = 1): Promise<Paginated<Compra>> {
  const { data } = await api.get<Paginated<Compra>>('/compras', { params: { page, per_page: 30 } });
  return data;
}

export async function fetchCompra(id: number): Promise<Compra> {
  const { data } = await api.get<Resource<Compra>>(`/compras/${id}`);
  return data.data;
}
