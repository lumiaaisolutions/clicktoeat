import { api } from '@/core/api';
import type { Categoria, Resource } from '@/lib/types';

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<{ data: Categoria[] }>('/categorias');
  return data.data;
}

export async function createCategoria(payload: { nombre: string; icono?: string; orden?: number }): Promise<Categoria> {
  const { data } = await api.post<Resource<Categoria>>('/categorias', payload);
  return data.data;
}

export async function updateCategoria(id: number, payload: Partial<Categoria>): Promise<Categoria> {
  const { data } = await api.patch<Resource<Categoria>>(`/categorias/${id}`, payload);
  return data.data;
}

export async function deleteCategoria(id: number): Promise<void> {
  await api.delete(`/categorias/${id}`);
}
