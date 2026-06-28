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

export interface AdminReports {
  range: { start: string; end: string };
  summary: {
    orders: number;
    delivered: number;
    canceled: number;
    revenue: number;
    avg_ticket: number;
  };
  daily: Array<{ date: string; orders: number; revenue: number }>;
  top_products: Array<{ product_id: number; name: string; qty: number; revenue: number }>;
  top_customers: Array<{ user_id: number; name: string; orders: number; spend: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_payment: Array<{ method: string; count: number; revenue: number }>;
}

export async function getAdminDashboard() {
  const { data } = await api.get<AdminDashboard>("/dashboard/admin");
  return data;
}

export async function getAdminReports(startDate: string, endDate: string) {
  const { data } = await api.get<AdminReports>("/dashboard/reports", {
    params: { start_date: startDate, end_date: endDate },
  });
  return data;
}

export async function getDriverDashboard() {
  const { data } = await api.get<DriverDashboard>("/dashboard/driver");
  return data;
}
