import { useEffect, useState } from "react";
import { Loader2, DollarSign, Calendar, TrendingUp, Trophy } from "lucide-react";
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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }
  if (error || !data) {
    return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">💰 Ganancias</h1>

      <div className="card mb-6 bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-lg">
        <p className="text-sm opacity-90">Total acumulado</p>
        <p className="mt-1 text-4xl font-bold">{formatCurrency(data.total)}</p>
        <p className="mt-2 text-sm opacity-80">
          {data.deliveries_total} entregas completadas
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
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

      <p className="mt-6 text-center text-xs text-neutral-500">
        Las ganancias se calculan a partir de los pedidos entregados.
      </p>
    </div>
  );
}
