import { api } from '@/core/api';
import type { Staff } from '@/lib/types';

export async function fetchStaff(): Promise<Staff[]> {
  const { data } = await api.get<{ data: Staff[] }>('/local/staff');
  return data.data;
}
