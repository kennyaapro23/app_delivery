import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/types/api";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: number | null;
  role: UserRole | null;
  fullName: string | null;
  user: User | null;
  setTokens: (access: string, refresh: string) => void;
  setSession: (data: {
    access_token: string;
    refresh_token: string;
    user_id: number;
    role: UserRole;
    full_name: string;
  }) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      role: null,
      fullName: null,
      user: null,
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),
      setSession: (data) =>
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          userId: data.user_id,
          role: data.role,
          fullName: data.full_name,
          user: null,
        }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          role: null,
          fullName: null,
          user: null,
        }),
    }),
    { name: "chikenhot-auth" },
  ),
);

/**
 * Hook que devuelve `true` cuando zustand-persist terminó de leer localStorage.
 * Mientras devuelve `false` los guards deben mostrar un loader; si redirigen
 * antes de la rehidratación, mandan al usuario a /login con sesión válida.
 */
export function useAuthHydrated(): boolean {
  // useSyncExternalStore lee el snapshot (hasHydrated) de forma fresca en cada
  // render y se suscribe a onFinishHydration. Esto elimina la carrera del patrón
  // useState+useEffect: si la hidratación termina ENTRE el render y el effect,
  // el snapshot ya refleja `true` y el guard no queda colgado en el loader.
  return useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
