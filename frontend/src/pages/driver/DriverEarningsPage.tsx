import { useEffect, useState } from "react";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Trophy,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { getEarnings, type EarningsSummary } from "@/services/delivery";
import { StatCard } from "@/components/StatCard";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

export function DriverEarningsPage() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEarnings()
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton mb-6 h-8 w-44 rounded-lg" />
        <div className="skeleton mb-6 h-36 w-full rounded-2xl" />
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
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? "No se pudieron cargar las ganancias."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
        💰 Ganancias
      </h1>

      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-50">Total acumulado</p>
            <p className="mt-1 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {formatCurrency(data.total)}
            </p>
            <p className="mt-3 text-sm text-brand-50">
              {data.deliveries_total} entregas completadas
            </p>
          </div>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Wallet className="h-6 w-6" />
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Hoy"
          value={formatCurrency(data.today)}
          icon={DollarSign}
          tone="success"
          hint={`${data.deliveries_today} entregas`}
        />
        <StatCard
          label="Esta semana"
          value={formatCurrency(data.this_week)}
          icon={Calendar}
        />
        <StatCard
          label="Este mes"
          value={formatCurrency(data.this_month)}
          icon={TrendingUp}
        />
        <StatCard
          label="Total entregas"
          value={data.deliveries_total}
          icon={Trophy}
          tone="warning"
        />
      </div>

      <p className="mt-6 text-center text-xs text-ink-400">
        Las ganancias se calculan a partir de los pedidos entregados.
      </p>
    </div>
  );
}
