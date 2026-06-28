import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { login } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import { getErrorMessage } from "@/lib/api";
import { defaultHomeForRole } from "@/components/RoleGuard";
import {
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Bike,
  LogOut,
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import type { UserRole, TokenResponse } from "@/types/api";

const AUTH_STORAGE_KEY = "chikenhot-auth";

/**
 * Escribe la sesión directamente en localStorage en el formato que zustand-persist
 * espera, garantizando que el siguiente full-reload encuentre el rol correcto.
 * Evita race conditions entre el `set()` de zustand y `window.location.assign()`.
 */
function persistSessionSync(data: TokenResponse) {
  const payload = {
    state: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user_id,
      role: data.role,
      fullName: data.full_name,
      user: null,
    },
    version: 0,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

const DEMO_ACCOUNTS: {
  role: UserRole;
  email: string;
  password: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    role: "admin",
    email: "admin@chikenhot.pe",
    password: "admin123",
    label: "Admin",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    role: "customer",
    email: "cliente@chikenhot.pe",
    password: "cliente123",
    label: "Cliente",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    role: "delivery_driver",
    email: "delivery@chikenhot.pe",
    password: "delivery123",
    label: "Repartidor",
    icon: <Bike className="h-4 w-4" />,
  },
];

export function LoginPage() {
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explicitFrom = (location.state as { from?: string } | null)?.from;

  // Si ya hay sesión activa, mostramos un banner para que el usuario decida
  // si cierra sesión o cambia de cuenta. NO redirigimos automáticamente.
  //
  // IMPORTANTE: leemos cada campo en su propio selector (primitivos) para
  // evitar el bug "getSnapshot should be cached" / Maximum update depth.
  // Un selector que devuelve `{ ... }` literal crea referencia nueva en cada
  // render → Zustand re-dispara → loop infinito.
  const hasSession = useAuthStore((s) => !!s.accessToken && !!s.role);
  const currentRole = useAuthStore((s) => s.role);
  const currentFullName = useAuthStore((s) => s.fullName);

  function clearAndStay() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Recargar página para limpiar el estado de zustand en memoria.
    window.location.reload();
  }

  async function doLogin(emailToUse: string, passwordToUse: string) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Limpia toda la sesión previa (estado en memoria + localStorage) ANTES
      // de pegarle al backend. Si solo borramos localStorage, Zustand sigue
      // teniendo el rol viejo en memoria mientras corre el await, y al volver
      // setSession() el middleware persist puede arrastrar campos antiguos.
      // También limpiamos carrito/favoritos para no heredar datos del usuario anterior.
      useAuthStore.getState().logout();
      useCartStore.getState().clear();
      useFavoritesStore.getState().clear();
      localStorage.removeItem(AUTH_STORAGE_KEY);

      const data = await login(emailToUse, passwordToUse);
      // 1) Actualiza zustand (para tabs/componentes vivos)
      setSession(data);
      // 2) Persiste manualmente al localStorage (garantía antes del reload)
      persistSessionSync(data);
      // 3) Hard reload para que toda la app re-renderice con el rol correcto
      const target = explicitFrom ?? defaultHomeForRole(data.role);
      window.location.assign(target);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doLogin(email, password);
  }

  function quickLogin(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    void doLogin(account.email, account.password);
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="card overflow-hidden">
        {/* Cabecera con gradiente de marca */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-8 text-center text-white">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl shadow-pop backdrop-blur">
            🍗
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p className="mt-1 text-sm text-brand-50">Inicia sesión según tu rol</p>
        </div>

        <div className="p-8">
          {hasSession && currentRole && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-warn-200 bg-warn-50 p-4">
              <p className="flex items-start gap-2 text-sm text-warn-700">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Ya estás logueado como{" "}
                  <strong className="font-semibold text-warn-800">
                    {currentFullName}
                  </strong>{" "}
                  <span className="badge badge-warn ml-1 align-middle">
                    {roleLabel(currentRole)}
                  </span>
                </span>
              </p>
              <div className="flex gap-2">
                <a
                  href={defaultHomeForRole(currentRole)}
                  className="btn-secondary flex-1 !text-xs"
                >
                  Ir a mi panel
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={clearAndStay}
                  className="btn-ghost flex-1 !text-xs"
                >
                  <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
                </button>
              </div>
            </div>
          )}

          {/* Quick login para los 3 roles */}
          <div>
            <p className="label mb-2 text-center text-ink-500">
              Acceso rápido de demostración
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => quickLogin(acc)}
                  disabled={loading}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-200 bg-white p-3 text-xs font-semibold text-ink-700 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  title={acc.email}
                >
                  <span className="text-brand-500">{acc.icon}</span>
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-200" />
            <span className="text-xs font-medium text-ink-400">
              o usa tus credenciales
            </span>
            <div className="h-px flex-1 bg-ink-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-ink-400" />
                Email
              </label>
              <input
                type="email"
                required
                className="input-base"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-ink-400" />
                Contraseña
              </label>
              <input
                type="password"
                required
                className="input-base"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-ink-600">
              ¿No tienes cuenta?{" "}
              <Link
                to="/register"
                className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
              >
                Regístrate
              </Link>
            </p>
            <p className="text-xs text-ink-500">
              🛵 ¿Eres repartidor?{" "}
              <Link
                to="/register-driver"
                className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
              >
                Únete aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function roleLabel(role: UserRole): string {
  if (role === "admin") return "Admin";
  if (role === "delivery_driver") return "Repartidor";
  return "Cliente";
}
