import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Package, DollarSign, Star, TrendingUp } from "lucide-react";
import { getDriverDashboard, type DriverDashboard } from "@/services/dashboard";
import { getEarnings, type EarningsSummary } from "@/services/delivery";
import { StatCard } from "@/components/StatCard";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

export function DriverDashboardPage() {
  const [stats, setStats] = useState<DriverDashboard | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDriverDashboard(), getEarnings()])
      .then(([s, e]) => {
        setStats(s);
        setEarnings(e);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Bienvenido 🍗</h1>
      <p className="mb-6 text-sm text-neutral-500">Tu día en Chikenhot</p>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Ganancias hoy"
          value={formatCurrency(earnings?.today ?? stats?.earnings_today ?? 0)}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Entregas hoy"
          value={earnings?.deliveries_today ?? stats?.deliveries_completed ?? 0}
          icon={Package}
        />
        <StatCard
          label="Rating"
          value={
            stats?.average_rating != null ? stats.average_rating.toFixed(1) : "—"
          }
          icon={Star}
          tone="warning"
        />
        <StatCard
          label="Eficiencia"
          value={`${stats?.efficiency ?? 0}%`}
          icon={TrendingUp}
        />
      </div>

      {earnings && (
        <div className="card mt-6 p-5">
          <h2 className="mb-4 font-semibold">Resumen de ganancias</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Row label="Hoy" value={formatCurrency(earnings.today)} />
            <Row label="Esta semana" value={formatCurrency(earnings.this_week)} />
            <Row label="Este mes" value={formatCurrency(earnings.this_month)} />
            <Row label="Total" value={formatCurrency(earnings.total)} bold />
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/delivery/available" className="card p-4 text-center hover:shadow-md">
          <div className="text-2xl">🔔</div>
          <div className="mt-2 font-semibold">Ver disponibles</div>
        </Link>
        <Link to="/delivery/my-orders" className="card p-4 text-center hover:shadow-md">
          <div className="text-2xl">📦</div>
          <div className="mt-2 font-semibold">Mis pedidos</div>
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={bold ? "text-lg font-bold" : "font-semibold"}>{value}</div>
    </div>
  );
}
