import { api } from '@/core/api';
import type { AuditLog, Paginated } from '@/lib/types';

export async function fetchAuditLogs(page = 1): Promise<Paginated<AuditLog>> {
  const { data } = await api.get<Paginated<AuditLog>>('/audit-logs', { params: { page, per_page: 50 } });
  return data;
}
