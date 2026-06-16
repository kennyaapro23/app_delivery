import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/store/auth";
import type { UserRole } from "@/types/api";

export function RoleGuard({ allow }: { allow: UserRole[] }) {
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  // Esperar la rehidratación antes de decidir. Sin esto, en un hard-reload
  // el primer render ve token=null/role=null y redirige a /login a alguien
  // que SÍ tenía sesión guardada.
  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  if (!role) {
    // Sesión inconsistente: token pero sin rol. Mejor pedir login fresh.
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(role)) {
    return <Navigate to={defaultHomeForRole(role)} replace />;
  }
  return <Outlet />;
}

export function defaultHomeForRole(role: UserRole | null): string {
  if (role === "admin") return "/admin";
  if (role === "delivery_driver") return "/delivery";
  return "/";
}
