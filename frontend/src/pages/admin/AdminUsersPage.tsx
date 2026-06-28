import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Power, PowerOff, AlertCircle, AlertTriangle } from "lucide-react";
import { listUsers, getUserStats, setUserActive, type UserStats } from "@/services/users";
import { StatCard } from "@/components/StatCard";
import { Users as UsersIcon, UserCheck, ShoppingBag, Bike, ShieldCheck, UserPlus } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { User, UserRole } from "@/types/api";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  customer: "Cliente",
  delivery_driver: "Repartidor",
};

const ROLE_BADGES: Record<UserRole, string> = {
  admin: "badge-info",
  customer: "badge-info",
  delivery_driver: "badge-warn",
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [role, setRole] = useState<UserRole | "all">("all");
  const [search, setSearch] = useState("");
  // Término de búsqueda con debounce: evita disparar una petición por tecla.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Marca si ya completamos la primera carga, para no parpadear el loader
  // completo en cada cambio de filtro posterior.
  const firstLoadDone = useRef(false);
  // Guardia de secuencia: solo la respuesta más reciente actualiza el estado,
  // evitando que respuestas fuera de orden sobrescriban datos más nuevos.
  const reqSeq = useRef(0);

  // Debounce del término de búsqueda (300ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const seq = ++reqSeq.current;
    if (!firstLoadDone.current) setLoading(true);
    setError(null);
    listUsers({
      role: role === "all" ? undefined : role,
      search: debouncedSearch.trim() || undefined,
      limit: 100,
    })
      .then((d) => {
        if (seq !== reqSeq.current) return; // respuesta obsoleta: descartar
        setUsers(d.users);
        setError(null);
      })
      .catch((e) => {
        if (seq !== reqSeq.current) return;
        setError(getErrorMessage(e));
      })
      .finally(() => {
        if (seq !== reqSeq.current) return;
        firstLoadDone.current = true;
        setLoading(false);
      });
  }, [role, debouncedSearch]);

  useEffect(() => {
    getUserStats()
      .then((s) => {
        setStats(s);
        setStatsError(false);
      })
      .catch(() => setStatsError(true));
  }, []);

  // Recarga manual tras una mutación (toggle de estado), reseteando el error.
  function reload() {
    const seq = ++reqSeq.current;
    setError(null);
    listUsers({
      role: role === "all" ? undefined : role,
      search: debouncedSearch.trim() || undefined,
      limit: 100,
    })
      .then((d) => {
        if (seq !== reqSeq.current) return;
        setUsers(d.users);
        setError(null);
      })
      .catch((e) => {
        if (seq !== reqSeq.current) return;
        setError(getErrorMessage(e));
      });
  }

  async function handleToggleActive(u: User) {
    const action = u.is_active ? "Desactivar" : "Activar";
    if (!confirm(`¿${action} a ${u.full_name}?`)) return;
    try {
      await setUserActive(u.id, !u.is_active);
      reload();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  const searching = debouncedSearch !== search;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
          Usuarios
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Administra clientes, repartidores y administradores.
        </p>
      </div>

      {stats ? (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total_users} icon={UsersIcon} />
          <StatCard label="Activos" value={stats.active_users} icon={UserCheck} tone="success" />
          <StatCard label="Clientes" value={stats.customers} icon={ShoppingBag} />
          <StatCard label="Repartidores" value={stats.drivers} icon={Bike} />
          <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} />
          <StatCard label="Nuevos (semana)" value={stats.new_this_week} icon={UserPlus} tone="warning" />
        </div>
      ) : statsError ? (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          No se pudieron cargar las estadísticas.
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="skeleton h-7 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input-base pl-10"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-400" />
          )}
        </div>
        <select
          className="input-base sm:w-48"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | "all")}
        >
          <option value="all">Todos los roles</option>
          <option value="customer">Clientes</option>
          <option value="delivery_driver">Repartidores</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="card overflow-hidden">
          <div className="divide-y divide-ink-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3 rounded" />
                  <div className="skeleton h-3 w-1/4 rounded" />
                </div>
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="text-5xl">🔍</div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">No se encontraron usuarios</h3>
          <p className="mt-1 text-sm text-ink-500">Prueba con otro término de búsqueda o rol.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Registro</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((u) => (
                  <tr key={u.id} className={cn("transition hover:bg-ink-50", !u.is_active && "opacity-60")}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-900">{u.full_name}</div>
                      <div className="text-xs text-ink-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge", ROLE_BADGES[u.role])}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge bg-ink-100 text-ink-600">Inactivo</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={cn(
                            "rounded-lg p-2 transition focus-visible:outline-none focus-visible:ring-2",
                            u.is_active
                              ? "text-danger-600 hover:bg-danger-50 focus-visible:ring-danger-300"
                              : "text-success-600 hover:bg-success-50 focus-visible:ring-success-300",
                          )}
                          title={u.is_active ? "Desactivar usuario" : "Activar usuario"}
                        >
                          {u.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
