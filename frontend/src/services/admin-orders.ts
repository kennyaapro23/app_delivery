import { api } from "@/lib/api";
import type { Order, OrderListResponse, OrderStatus } from "@/types/api";

export async function listAllOrders(params?: {
  status?: OrderStatus;
  skip?: number;
  limit?: number;
}) {
  const { data } = await api.get<OrderListResponse>("/orders", { params });
  return data;
}

export async function updateOrderStatus(orderId: number, status: OrderStatus) {
  const { data } = await api.patch<Order>(`/orders/${orderId}/status`, { status });
  return data;
}
