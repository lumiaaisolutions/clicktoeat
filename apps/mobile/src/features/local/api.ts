import { api } from '@/core/api';
import type { LocalFull, Resource } from '@/lib/types';

export async function fetchLocal(): Promise<LocalFull> {
  const { data } = await api.get<Resource<LocalFull>>('/local');
  return data.data;
}

export async function updateLocal(payload: Partial<LocalFull>): Promise<LocalFull> {
  const { data } = await api.patch<Resource<LocalFull>>('/local', payload);
  return data.data;
}
