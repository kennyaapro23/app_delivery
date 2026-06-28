import { useEffect, useState } from "react";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Trophy,
  AlertCircle,
  Wallet,
  CalendarDays,
  PiggyBank,
} from "lucide-react";
import { getEarnings, type EarningsSummary } from "@/services/delivery";
import { StatCard } from "@/components/StatCard";
import { formatCurrency, cn } from "@/lib/utils";
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
        <div className="skeleton mb-6 h-40 w-full rounded-2xl" />
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
        <div className="skeleton mt-6 h-48 w-full rounded-xl" />
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

  const avgPerDelivery =
    data.deliveries_total > 0 ? data.total / data.deliveries_total : 0;

  const breakdown = [
    { label: "Hoy", value: data.today, tone: "success" as const },
    { label: "Esta semana", value: data.this_week, tone: "info" as const },
    { label: "Este mes", value: data.this_month, tone: "warn" as const },
  ];
  const maxBreakdown = Math.max(...breakdown.map((b) => b.value), 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
        💰 Ganancias
      </h1>

      {/* Hero: total acumulado */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-pop">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
            <p className="text-xs font-medium text-brand-50">Promedio / entrega</p>
            <p className="mt-0.5 font-display text-lg font-bold">
              {formatCurrency(avgPerDelivery)}
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
            <p className="text-xs font-medium text-brand-50">Entregas hoy</p>
            <p className="mt-0.5 font-display text-lg font-bold">
              {data.deliveries_today}
            </p>
          </div>
        </div>
      </section>

      {/* KPIs */}
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
          tone="default"
        />
        <StatCard
          label="Este mes"
          value={formatCurrency(data.this_month)}
          icon={TrendingUp}
          tone="default"
        />
        <StatCard
          label="Total entregas"
          value={data.deliveries_total}
          icon={Trophy}
          tone="warning"
        />
      </div>

      {/* Desglose por periodo */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="section-title mb-5">Desglose por periodo</h2>
          <div className="space-y-5">
            {breakdown.map((b) => (
              <BreakdownBar
                key={b.label}
                label={b.label}
                value={b.value}
                pct={(b.value / maxBreakdown) * 100}
                tone={b.tone}
              />
            ))}
          </div>
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <h2 className="section-title">Resumen</h2>
          <SummaryRow
            icon={CalendarDays}
            label="Acumulado del mes"
            value={formatCurrency(data.this_month)}
            tone="warn"
          />
          <SummaryRow
            icon={PiggyBank}
            label="Total histórico"
            value={formatCurrency(data.total)}
            tone="success"
          />
          <p className="mt-auto text-xs text-ink-400">
            Las ganancias se calculan a partir de los pedidos entregados.
          </p>
        </div>
      </section>
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: "success" | "info" | "warn";
}) {
  const width = Math.max(2, Math.min(100, pct));
  const bars: Record<typeof tone, string> = {
    success: "bg-success-500",
    info: "bg-info-500",
    warn: "bg-warn-500",
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-700">{label}</span>
        <span className="font-display text-sm font-bold text-ink-900">
          {formatCurrency(value)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full transition-all", bars[tone])}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  tone: "warn" | "success";
}) {
  const chips: Record<typeof tone, string> = {
    warn: "bg-warn-50 text-warn-700",
    success: "bg-success-50 text-success-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          chips[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="font-display text-lg font-bold text-ink-900">{value}</p>
      </div>
    </div>
  );
}
