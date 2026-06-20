import { api } from '@/core/api';
import type { Paginated, Pedido, PedidoEstado, Resource } from '@/lib/types';

export type PedidosFilters = {
  estado?: PedidoEstado | PedidoEstado[];
  page?: number;
  per_page?: number;
};

export async function fetchPedidos(filters: PedidosFilters = {}): Promise<Paginated<Pedido>> {
  const params: Record<string, string | number> = {};
  if (filters.estado) {
    params.estado = Array.isArray(filters.estado) ? filters.estado.join(',') : filters.estado;
  }
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;

  const { data } = await api.get<Paginated<Pedido>>('/pedidos', { params });
  return data;
}

export async function fetchPedido(id: number | string): Promise<Pedido> {
  const { data } = await api.get<Resource<Pedido>>(`/pedidos/${id}`);
  return data.data;
}

export async function updatePedidoEstado(
  id: number | string,
  estado: PedidoEstado,
): Promise<Pedido> {
  const { data } = await api.patch<Resource<Pedido>>(`/pedidos/${id}/estado`, { estado });
  return data.data;
}
