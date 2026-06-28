import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/store/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Instancia "limpia" para el refresh: comparte la misma baseURL que `api`
// (evita que el manejo de baseURL diverja entre llamadas normales y refresh)
// pero NO lleva interceptores, así no entra en un bucle de refresh ni reaplica
// el Authorization viejo del store.
const refreshClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const { data } = await refreshClient.post("/auth/refresh", {
      refresh_token: refreshToken,
    });
    // Algunos backends no rotan el refresh token (devuelven solo access_token);
    // preservar el previo evita que el siguiente refresh haga logout por falta
    // de refresh token.
    if (!data?.access_token) {
      logout();
      return null;
    }
    setTokens(data.access_token, data.refresh_token ?? refreshToken);
    return data.access_token;
  } catch {
    logout();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    // No intentar refresh para 401 provenientes de los propios endpoints de auth
    // (login/refresh): un refresh fallido no debe disparar otro refresh.
    const url = original?.url ?? "";
    const isAuthEndpoint = url.includes("/auth/refresh") || url.includes("/auth/login");
    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const newToken = await refreshing;
      if (newToken) {
        // Reintenta con el MISMO config (lleva _retry). El interceptor de request
        // reaplica el Authorization con el token ya actualizado en el store, así
        // que no hace falta setearlo manualmente aquí.
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg as string;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Ocurrió un error inesperado";
}
