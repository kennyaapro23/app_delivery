import { useEffect, useState } from "react";
import { Loader2, Search, Power, PowerOff } from "lucide-react";
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

const ROLE_STYLES: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800",
  customer: "bg-blue-100 text-blue-800",
  delivery_driver: "bg-orange-100 text-orange-800",
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [role, setRole] = useState<UserRole | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listUsers({
      role: role === "all" ? undefined : role,
      search: search.trim() || undefined,
      limit: 100,
    })
      .then((d) => setUsers(d.users))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [role, search]);
  useEffect(() => { getUserStats().then(setStats).catch(() => {}); }, []);

  async function handleToggleActive(u: User) {
    const action = u.is_active ? "Desactivar" : "Activar";
    if (!confirm(`¿${action} a ${u.full_name}?`)) return;
    try {
      await setUserActive(u.id, !u.is_active);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Usuarios</h1>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total_users} icon={UsersIcon} />
          <StatCard label="Activos" value={stats.active_users} icon={UserCheck} tone="success" />
          <StatCard label="Clientes" value={stats.customers} icon={ShoppingBag} />
          <StatCard label="Repartidores" value={stats.drivers} icon={Bike} />
          <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} />
          <StatCard label="Nuevos (semana)" value={stats.new_this_week} icon={UserPlus} tone="warning" />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-base pl-10"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {users.map((u) => (
                <tr key={u.id} className={cn(!u.is_active && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-neutral-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("badge", ROLE_STYLES[u.role])}>{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="badge bg-green-100 text-green-700">Activo</span>
                    ) : (
                      <span className="badge bg-neutral-200 text-neutral-700">Inactivo</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={cn(
                        "rounded-lg p-2",
                        u.is_active
                          ? "text-red-600 hover:bg-red-50"
                          : "text-green-600 hover:bg-green-50",
                      )}
                      title={u.is_active ? "Desactivar usuario" : "Activar usuario"}
                    >
                      {u.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
