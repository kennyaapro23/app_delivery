import { api } from "@/lib/api";

export interface NearbyOrder {
  id: number;
  order_number: string;
  status: string;
  delivery_address: string;
  total: number;
  delivery_fee: number;
  payment_method: string;
  created_at: string;
}

export interface EarningsSummary {
  today: number;
  this_week: number;
  this_month: number;
  total: number;
  deliveries_today: number;
  deliveries_total: number;
}

export interface DriverProfile {
  id: number;
  user_id: number;
  full_name?: string;
  email?: string;
  phone?: string;
  // Personales
  document_id?: string;
  birth_date?: string;
  gender?: string;
  home_address?: string;
  home_district?: string;
  // Emergencia
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  // Vehículo
  vehicle_type?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_plate?: string;
  license_number?: string;
  license_expiry?: string;
  insurance_number?: string;
  insurance_expiry?: string;
  // Banco
  bank_name?: string;
  bank_account_type?: string;
  bank_account?: string;
  bank_cci?: string;
  bank_account_holder?: string;
  // Estado
  is_available: boolean;
  latitude?: number | null;
  longitude?: number | null;
  total_deliveries: number;
  average_rating: number;
  total_earnings: number;
  current_zone?: string;
}

export async function getNearbyOrders() {
  const { data } = await api.get<{ orders: NearbyOrder[] }>("/delivery/nearby-orders");
  return data.orders;
}

export async function acceptOrder(orderId: number) {
  const { data } = await api.post<{ message: string; order_id: number }>(
    `/delivery/accept/${orderId}`,
  );
  return data;
}

export async function completeDelivery(orderId: number) {
  const { data } = await api.patch<{ message: string; order_id: number }>(
    `/delivery/complete/${orderId}`,
  );
  return data;
}

export async function toggleAvailability() {
  const { data } = await api.post<{ is_available: boolean; message: string }>(
    "/delivery/toggle-availability",
  );
  return data;
}

export async function getEarnings() {
  const { data } = await api.get<EarningsSummary>("/delivery/earnings");
  return data;
}

export async function listAllDrivers() {
  const { data } = await api.get<DriverProfile[]>("/delivery/drivers");
  return data;
}
