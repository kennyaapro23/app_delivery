import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { login } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import { getErrorMessage } from "@/lib/api";
import { defaultHomeForRole } from "@/components/RoleGuard";
import { Loader2, ShieldCheck, ShoppingBag, Bike, LogOut } from "lucide-react";
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
  color: string;
}[] = [
  {
    role: "admin",
    email: "admin@chikenhot.pe",
    password: "admin123",
    label: "Admin",
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
  },
  {
    role: "customer",
    email: "cliente@chikenhot.pe",
    password: "cliente123",
    label: "Cliente",
    icon: <ShoppingBag className="h-4 w-4" />,
    color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
  },
  {
    role: "delivery_driver",
    email: "delivery@chikenhot.pe",
    password: "delivery123",
    label: "Repartidor",
    icon: <Bike className="h-4 w-4" />,
    color: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200",
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
      <div className="card p-8">
        <div className="mb-6 text-center">
          <div className="text-4xl">🍗</div>
          <h1 className="mt-2 text-2xl font-bold">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Inicia sesión según tu rol
          </p>
        </div>

        {hasSession && currentRole && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">
              Ya estás logueado como{" "}
              <strong>{currentFullName}</strong>{" "}
              <span className="text-xs text-amber-700">
                ({roleLabel(currentRole)})
              </span>
            </p>
            <div className="mt-2 flex gap-2">
              <a
                href={defaultHomeForRole(currentRole)}
                className="btn-ghost flex-1 !text-xs"
              >
                Ir a mi panel
              </a>
              <button onClick={clearAndStay} className="btn-ghost flex-1 !text-xs">
                <LogOut className="h-3 w-3" /> Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* Quick login para los 3 roles */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => quickLogin(acc)}
              disabled={loading}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-semibold transition disabled:opacity-50 ${acc.color}`}
              title={acc.email}
            >
              {acc.icon}
              {acc.label}
            </button>
          ))}
        </div>
        <p className="mb-5 text-center text-xs text-neutral-400">
          o usa tus credenciales
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
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
            <label className="mb-1 block text-sm font-medium">Contraseña</label>
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
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Regístrate
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-neutral-500">
          🛵 ¿Eres repartidor?{" "}
          <Link to="/register-driver" className="font-semibold text-orange-600 hover:underline">
            Únete aquí
          </Link>
        </p>
      </div>
    </div>
  );
}

function roleLabel(role: UserRole): string {
  if (role === "admin") return "Admin";
  if (role === "delivery_driver") return "Repartidor";
  return "Cliente";
}
