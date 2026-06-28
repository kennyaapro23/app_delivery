import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  DollarSign,
  Star,
  TrendingUp,
  AlertCircle,
  Bell,
  ChevronRight,
} from "lucide-react";
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
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 space-y-2">
          <div className="skeleton h-8 w-56 rounded-lg" />
          <div className="skeleton h-4 w-40 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-20 rounded" />
                  <div className="skeleton h-7 w-16 rounded" />
                </div>
                <div className="skeleton h-10 w-10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="skeleton mt-6 h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
          Bienvenido 🍗
        </h1>
        <p className="mt-1 text-sm text-ink-500">Tu día en Chikenhot</p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
        <section className="card mt-6 p-6">
          <h2 className="section-title mb-4">Resumen de ganancias</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Row label="Hoy" value={formatCurrency(earnings.today)} />
            <Row label="Esta semana" value={formatCurrency(earnings.this_week)} />
            <Row label="Este mes" value={formatCurrency(earnings.this_month)} />
            <Row label="Total" value={formatCurrency(earnings.total)} bold />
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="section-title mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/delivery/available"
            className="card-hover group flex items-center gap-4 p-5"
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
              <Bell className="h-6 w-6" />
            </span>
            <span className="flex-1">
              <span className="block text-base font-semibold text-ink-900 transition group-hover:text-brand-600">
                Ver disponibles
              </span>
              <span className="block text-sm text-ink-500">
                Pedidos esperando repartidor
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </Link>
          <Link
            to="/delivery/my-orders"
            className="card-hover group flex items-center gap-4 p-5"
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-info-50 text-info-600 transition group-hover:bg-info-100">
              <Package className="h-6 w-6" />
            </span>
            <span className="flex-1">
              <span className="block text-base font-semibold text-ink-900 transition group-hover:text-brand-600">
                Mis pedidos
              </span>
              <span className="block text-sm text-ink-500">
                Pedidos activos e historial
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-muted px-4 py-3">
      <div className="text-xs text-ink-500">{label}</div>
      <div
        className={
          bold
            ? "mt-0.5 font-display text-lg font-bold text-brand-600"
            : "mt-0.5 font-display text-lg font-bold text-ink-900"
        }
      >
        {value}
      </div>
    </div>
  );
}
