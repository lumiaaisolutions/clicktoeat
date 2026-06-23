import { api } from '@/core/api';
import type { HorariosResponse, HorarioSlot, Resource } from '@/lib/types';

export async function fetchHorarios(): Promise<HorariosResponse> {
  const { data } = await api.get<Resource<HorariosResponse>>('/local/horarios');
  return data.data;
}

export async function updateHorarios(payload: {
  horarios?: HorarioSlot[];
  cerrado_temporal?: boolean;
}): Promise<HorariosResponse> {
  const { data } = await api.patch<Resource<HorariosResponse>>('/local/horarios', payload);
  return data.data;
}
