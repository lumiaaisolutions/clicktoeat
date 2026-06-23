import { api } from '@/core/api';
import type { SearchResponse } from '@/lib/types';

export async function searchGlobal(q: string): Promise<SearchResponse['data']> {
  if (q.trim().length < 2) {
    return { pedidos: [], productos: [], clientes: [] };
  }
  const { data } = await api.get<SearchResponse>('/search', { params: { q } });
  return data.data;
}
