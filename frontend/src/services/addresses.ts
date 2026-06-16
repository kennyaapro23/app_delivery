import { api } from "@/lib/api";

export interface Address {
  id: number;
  user_id: number;
  label: string;
  full_address: string;
  reference?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
  created_at: string;
}

export interface AddressInput {
  label: string;
  full_address: string;
  reference?: string;
  district?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

export async function listAddresses() {
  const { data } = await api.get<Address[]>("/addresses");
  return data;
}

export async function createAddress(payload: AddressInput) {
  const { data } = await api.post<Address>("/addresses", payload);
  return data;
}

export async function updateAddress(id: number, payload: Partial<AddressInput>) {
  const { data } = await api.put<Address>(`/addresses/${id}`, payload);
  return data;
}

export async function deleteAddress(id: number) {
  const { data } = await api.delete<{ message: string }>(`/addresses/${id}`);
  return data;
}
