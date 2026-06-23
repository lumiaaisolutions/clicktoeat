import { api } from '@/core/api';
import type { Categoria, Paginated, Producto, Resource } from '@/lib/types';

export type ProductosFilters = {
  categoria_id?: number;
  disponible?: boolean;
  q?: string;
  page?: number;
  per_page?: number;
};

export async function fetchProductos(filters: ProductosFilters = {}): Promise<Paginated<Producto>> {
  const params: Record<string, string | number> = {};
  if (filters.categoria_id) params.categoria_id = filters.categoria_id;
  if (filters.disponible !== undefined) params.disponible = filters.disponible ? 1 : 0;
  if (filters.q) params.q = filters.q;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;

  const { data } = await api.get<Paginated<Producto>>('/productos', { params });
  return data;
}

export async function fetchProducto(id: number): Promise<Producto> {
  const { data } = await api.get<Resource<Producto>>(`/productos/${id}`);
  return data.data;
}

export async function updateProducto(id: number, payload: Partial<Producto>): Promise<Producto> {
  const { data } = await api.patch<Resource<Producto>>(`/productos/${id}`, payload);
  return data.data;
}

export async function toggleDisponibilidad(producto: Producto): Promise<Producto> {
  return updateProducto(producto.id, { disponible: !producto.disponible });
}

export async function fetchCategoriasSimple(): Promise<Categoria[]> {
  const { data } = await api.get<{ data: Categoria[] }>('/categorias');
  return data.data;
}
