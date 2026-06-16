import { api } from "@/lib/api";
import type { User } from "@/types/api";

export interface UserStats {
  total_users: number;
  active_users: number;
  customers: number;
  drivers: number;
  admins: number;
  new_this_week: number;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

export async function listUsers(params?: {
  role?: string;
  search?: string;
  skip?: number;
  limit?: number;
}) {
  const { data } = await api.get<UserListResponse>("/users", { params });
  return data;
}

export async function getUserStats() {
  const { data } = await api.get<UserStats>("/users/stats");
  return data;
}

export async function deactivateUser(id: number) {
  const { data } = await api.delete<User>(`/users/${id}`);
  return data;
}

export async function setUserActive(id: number, is_active: boolean) {
  const { data } = await api.put<User>(`/users/${id}`, { is_active });
  return data;
}
