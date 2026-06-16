import { useEffect, useState } from "react";
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
  // El init perezoso de useState ya pregunta por la rehidratación al primer
  // render; el effect solo necesita suscribirse para el caso async.
  const [hydrated, setHydrated] = useState<boolean>(() =>
    useAuthStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [hydrated]);
  return hydrated;
}
