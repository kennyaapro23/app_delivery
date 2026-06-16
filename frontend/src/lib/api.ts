import axios, { AxiosError, AxiosHeaders } from "axios";
import { useAuthStore } from "@/store/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

export const api = axios.create({
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
    const { data } = await axios.post(
      `${API_BASE}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    setTokens(data.access_token, data.refresh_token);
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
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const newToken = await refreshing;
      if (newToken) {
        // En axios v1 los headers son AxiosHeaders; reemplazar el objeto por uno
        // plano rompe Content-Type y otros headers internos. Usar .set() preserva todo.
        const headers = AxiosHeaders.from(original.headers);
        headers.set("Authorization", `Bearer ${newToken}`);
        original.headers = headers;
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
