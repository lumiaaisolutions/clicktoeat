import { api } from '@/core/api';
import type { Ingrediente, MovimientoInventario, Paginated, Resource } from '@/lib/types';

export async function fetchIngredientes(bajoStock = false): Promise<Ingrediente[]> {
  const { data } = await api.get<{ data: Ingrediente[] }>('/ingredientes', {
    params: { bajo_stock: bajoStock ? 1 : undefined },
  });
  return data.data;
}

export async function fetchIngrediente(id: number): Promise<Ingrediente> {
  const { data } = await api.get<Resource<Ingrediente>>(`/ingredientes/${id}`);
  return data.data;
}

export async function ajustarStock(
  id: number,
  payload: { tipo: 'entrada' | 'ajuste' | 'merma'; cantidad: number; motivo?: string },
): Promise<Ingrediente> {
  const { data } = await api.post<Resource<Ingrediente>>(`/ingredientes/${id}/ajuste`, payload);
  return data.data;
}

export async function fetchMovimientos(
  ingredienteId: number,
  page = 1,
): Promise<Paginated<MovimientoInventario>> {
  const { data } = await api.get<Paginated<MovimientoInventario>>(
    `/ingredientes/${ingredienteId}/movimientos`,
    { params: { page, per_page: 30 } },
  );
  return data;
}
