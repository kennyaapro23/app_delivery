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

  // Aunque el status sea 2xx, algunos backends devuelven un JSON de error con
  // content-type no-PDF. Sin validar, construiríamos un "PDF" con ese JSON y el
  // navegador descargaría un archivo ilegible sin avisar.
  const contentType = String(res.headers["content-type"] ?? "");
  const data = res.data as Blob;
  if (!contentType.includes("application/pdf")) {
    let message = "No se pudo generar la factura";
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (typeof parsed?.detail === "string") message = parsed.detail;
      else if (text.trim()) message = text;
    } catch {
      // cuerpo no parseable: usar mensaje por defecto
    }
    throw new Error(message);
  }

  const blob = new Blob([data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `factura-${orderNumber.replace("#", "")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
