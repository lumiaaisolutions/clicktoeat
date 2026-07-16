import { api } from '@/core/api';
import type { Pedido } from '@/lib/types';

export interface Llamado {
  id: number;
  mesa: string | null;
  mesa_id: number;
  created_at: string;
}

export async function fetchPedidosCocina(): Promise<Pedido[]> {
  const { data } = await api.get<{ data: Pedido[] }>('/salon/cocina/pedidos');
  return data.data;
}

export async function fetchPedidosMesero(): Promise<Pedido[]> {
  const { data } = await api.get<{ data: Pedido[] }>('/salon/mesero/pedidos');
  return data.data;
}

export async function fetchLlamados(): Promise<Llamado[]> {
  const { data } = await api.get<{ data: Llamado[] }>('/salon/llamados');
  return data.data;
}

export async function atenderLlamado(id: number): Promise<Llamado> {
  const { data } = await api.post<{ data: Llamado }>(`/salon/llamados/${id}/atender`);
  return data.data;
}
