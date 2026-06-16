import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/store/auth";

export function ProtectedRoute() {
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.accessToken);
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
  return <Outlet />;
}
