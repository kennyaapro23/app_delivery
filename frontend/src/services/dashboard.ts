import { api } from "@/lib/api";

export interface AdminDashboard {
  orders_today: number;
  orders_change_percent: number;
  revenue_today: number;
  revenue_change_percent: number;
  active_users: number;
  total_drivers: number;
  available_drivers: number;
  pending_orders: number;
}

export interface DriverDashboard {
  deliveries_today: number;
  deliveries_completed: number;
  earnings_today: number;
  average_rating: number;
  punctuality: number;
  satisfaction: number;
  efficiency: number;
}

export async function getAdminDashboard() {
  const { data } = await api.get<AdminDashboard>("/dashboard/admin");
  return data;
}

export async function getDriverDashboard() {
  const { data } = await api.get<DriverDashboard>("/dashboard/driver");
  return data;
}
