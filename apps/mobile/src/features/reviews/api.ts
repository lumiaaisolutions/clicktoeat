import { api } from '@/core/api';
import type { Resource, Review } from '@/lib/types';

export async function fetchReviewsAdmin(): Promise<Review[]> {
  const { data } = await api.get<{ data: Review[] }>('/admin/reviews');
  return data.data;
}

export async function toggleReviewAprobado(id: number): Promise<Review> {
  const { data } = await api.patch<Resource<Review>>(`/admin/reviews/${id}/toggle`);
  return data.data;
}

export async function deleteReview(id: number): Promise<void> {
  await api.delete(`/admin/reviews/${id}`);
}
