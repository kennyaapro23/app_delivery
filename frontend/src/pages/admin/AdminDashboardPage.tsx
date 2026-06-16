import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, DollarSign, Users, Bike, Clock, UserCheck } from "lucide-react";
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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }
  if (error || !data) {
    return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
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
