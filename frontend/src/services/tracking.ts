import { api } from "@/lib/api";

export interface OrderTracking {
  order_id: number;
  order_number: string;
  status: string;
  driver_id: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_latitude: number | null;
  driver_longitude: number | null;
  driver_zone: string | null;
  driver_vehicle_type: "moto" | "bicicleta" | "auto" | null;
  driver_updated_at: string | null;
  delivery_address: string;
  is_active: boolean;
}

export async function getOrderTracking(orderId: number) {
  const { data } = await api.get<OrderTracking>(`/orders/${orderId}/tracking`);
  return data;
}

export async function updateDriverLocation(payload: {
  latitude: number;
  longitude: number;
  zone?: string;
}) {
  const { data } = await api.patch("/delivery/location", payload);
  return data;
}
