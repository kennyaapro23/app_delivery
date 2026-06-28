import { useEffect, useState } from "react";
import {
  AlertCircle,
  ShoppingBag,
  DollarSign,
  Users,
  Bike,
  Clock,
  UserCheck,
} from "lucide-react";
import { getAdminDashboard, type AdminDashboard } from "@/services/dashboard";
import { StatCard } from "@/components/StatCard";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 space-y-2">
          <div className="skeleton h-8 w-48 rounded-lg" />
          <div className="skeleton h-4 w-72 rounded" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-7 w-20 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
                <div className="skeleton h-10 w-10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? "No se pudo cargar el dashboard"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Resumen de la operación de hoy en Chikenhot.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pedidos hoy"
          value={data.orders_today}
          icon={ShoppingBag}
          trend={data.orders_change_percent}
        />
        <StatCard
          label="Ingresos hoy"
          value={formatCurrency(data.revenue_today)}
          icon={DollarSign}
          tone="success"
          trend={data.revenue_change_percent}
        />
        <StatCard
          label="Pedidos pendientes"
          value={data.pending_orders}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Usuarios activos"
          value={data.active_users}
          icon={Users}
        />
        <StatCard
          label="Repartidores"
          value={data.total_drivers}
          icon={Bike}
          hint={`${data.available_drivers} disponibles ahora`}
        />
        <StatCard
          label="Disponibles ahora"
          value={data.available_drivers}
          icon={UserCheck}
          tone="success"
        />
      </div>
    </div>
  );
}
