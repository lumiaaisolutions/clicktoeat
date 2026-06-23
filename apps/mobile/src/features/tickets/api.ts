import { api } from '@/core/api';
import type { Resource, SupportTicket } from '@/lib/types';

export async function fetchMyTickets(): Promise<SupportTicket[]> {
  const { data } = await api.get<{ data: SupportTicket[] }>('/soporte/tickets');
  return data.data;
}

export async function createTicket(payload: {
  asunto: string;
  mensaje: string;
  categoria?: string;
  prioridad?: string;
}): Promise<SupportTicket> {
  const { data } = await api.post<Resource<SupportTicket>>('/soporte/tickets', payload);
  return data.data;
}

export async function replyTicket(ticketId: number, mensaje: string): Promise<SupportTicket> {
  const { data } = await api.post<Resource<SupportTicket>>(`/soporte/tickets/${ticketId}/reply`, { mensaje });
  return data.data;
}
