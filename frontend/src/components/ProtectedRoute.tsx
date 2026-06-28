import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/store/auth";
import { defaultHomeForRole } from "@/components/RoleGuard";
import type { UserRole } from "@/types/api";

/**
 * Exige sesión activa. Opcionalmente restringe a ciertos roles vía `allow`:
 * sin `allow` solo verifica token (comportamiento previo); con `allow`, un
 * usuario autenticado con rol no permitido es enviado a su home por rol
 * (evita, p.ej., que un driver/admin entre a /checkout o /orders del cliente).
 */
export function ProtectedRoute({ allow }: { allow?: UserRole[] } = {}) {
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const location = useLocation();

  // Espera a que zustand-persist termine de leer localStorage. Sin esto,
  // un hard-reload puede redirigir a /login antes de cargar el token.
  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (allow && (!role || !allow.includes(role))) {
    return <Navigate to={defaultHomeForRole(role)} replace />;
  }
  return <Outlet />;
}
