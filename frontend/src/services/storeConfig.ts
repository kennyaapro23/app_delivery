import { api } from "@/lib/api";

export interface StoreConfig {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
}

export type StoreConfigUpdate = Partial<{
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
}>;

/** Configuración pública de la tienda (ubicación del restaurante). Todos los roles. */
export async function getStoreConfig() {
  const { data } = await api.get<StoreConfig>("/store-config");
  return data;
}

/** Actualiza la configuración de la tienda. Solo admin (requiere Bearer). */
export async function updateStoreConfig(payload: StoreConfigUpdate) {
  const { data } = await api.patch<StoreConfig>("/store-config", payload);
  return data;
}
