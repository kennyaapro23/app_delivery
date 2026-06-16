import { api } from "@/lib/api";
import type { Order, OrderListResponse, PaymentMethod } from "@/types/api";

export async function createOrder(payload: {
  items: { product_id: number; quantity: number }[];
  delivery_address: string;
  payment_method: PaymentMethod;
  notes?: string;
  coupon_code?: string;
}) {
  const { data } = await api.post<Order>("/orders", payload);
  return data;
}

export async function listMyOrders(params?: { status?: string }) {
  const { data } = await api.get<OrderListResponse>("/orders", { params });
  return data;
}

export async function getOrder(id: number) {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
}

export async function cancelOrder(id: number) {
  const { data } = await api.patch<Order>(`/orders/${id}/cancel`);
  return data;
}

export interface DeliveryFeePreview {
  fee: number;
  distance_km: number | null;
  base: number;
  per_km: number;
  min: number;
  max: number;
  raw_fee?: number;
  restaurant: { name: string; latitude: number; longitude: number };
  note: string;
}

export async function calculateDeliveryFee(payload: {
  latitude?: number;
  longitude?: number;
  address?: string;
}) {
  const { data } = await api.post<DeliveryFeePreview>("/orders/calculate-fee", payload);
  return data;
}

export async function downloadInvoice(id: number, orderNumber: string) {
  const res = await api.get(`/orders/${id}/invoice`, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `factura-${orderNumber.replace("#", "")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
