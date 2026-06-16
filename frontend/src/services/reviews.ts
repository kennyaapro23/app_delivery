import { api } from "@/lib/api";

export interface Review {
  id: number;
  order_id: number;
  customer_id: number;
  driver_id?: number | null;
  rating: number;
  comment?: string | null;
  created_at: string;
  customer_name?: string | null;
}

export async function createReview(payload: {
  order_id: number;
  rating: number;
  comment?: string;
}) {
  const { data } = await api.post<Review>("/reviews", payload);
  return data;
}

export async function listMyReviews() {
  const { data } = await api.get<Review[]>("/reviews/my");
  return data;
}

export async function listDriverReviews(driverId: number) {
  const { data } = await api.get<Review[]>(`/reviews/driver/${driverId}`);
  return data;
}
