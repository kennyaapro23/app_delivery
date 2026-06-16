import { api } from "@/lib/api";
import type { TokenResponse, User } from "@/types/api";

export async function login(email: string, password: string) {
  const { data } = await api.post<TokenResponse>("/auth/login/json", {
    email,
    password,
  });
  return data;
}

export async function register(payload: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}) {
  const { data } = await api.post<TokenResponse>("/auth/register", {
    ...payload,
    role: "customer",
  });
  return data;
}

export interface DriverRegisterPayload {
  // Cuenta
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  // Personales
  document_id?: string;
  birth_date?: string;
  gender?: "masculino" | "femenino" | "otro";
  home_address?: string;
  home_district?: string;
  // Emergencia
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  // Vehículo
  vehicle_type?: "moto" | "bicicleta" | "auto";
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
  bank_account_type?: "ahorros" | "corriente";
  bank_account?: string;
  bank_cci?: string;
  bank_account_holder?: string;
}

export async function registerDriver(payload: DriverRegisterPayload) {
  const { data } = await api.post<TokenResponse>("/auth/register-driver", payload);
  return data;
}

export async function getMe() {
  const { data } = await api.get<User>("/auth/me");
  return data;
}
