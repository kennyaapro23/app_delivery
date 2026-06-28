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
  Clock,
  Smile,
  Gauge,
  Map as MapIcon,
  Wallet,
  Sparkles,
} from "lucide-react";
import { getDriverDashboard, type DriverDashboard } from "@/services/dashboard";
import { getEarnings, type EarningsSummary } from "@/services/delivery";
import { StatCard } from "@/components/StatCard";
import { formatCurrency, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function DriverDashboardPage() {
  const fullName = useAuthStore((s) => s.fullName);
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
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="skeleton h-44 w-full rounded-xl lg:col-span-2" />
          <div className="skeleton h-44 w-full rounded-xl" />
        </div>
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

  const firstName = fullName?.trim().split(" ")[0] ?? "repartidor";
  const ratingValue = stats?.average_rating ?? 0;
  const efficiency = stats?.efficiency ?? 0;
  const punctuality = stats?.punctuality ?? 0;
  const satisfaction = stats?.satisfaction ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Cabecera con saludo */}
      <header className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-pop sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand-50">
              <Sparkles className="h-4 w-4" />
              {greeting()}
            </p>
            <h1 className="mt-1 truncate font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {firstName} 🍗
            </h1>
            <p className="mt-2 text-sm text-brand-50">
              Esto es lo que llevas hoy en Chikenhot.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur">
              <p className="text-xs font-medium text-brand-50">Ganancias hoy</p>
              <p className="font-display text-2xl font-extrabold leading-tight">
                {formatCurrency(earnings?.today ?? stats?.earnings_today ?? 0)}
              </p>
            </div>
            <div className="hidden rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur sm:block">
              <p className="text-xs font-medium text-brand-50">Entregas</p>
              <p className="font-display text-2xl font-extrabold leading-tight">
                {earnings?.deliveries_today ?? stats?.deliveries_completed ?? 0}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Ganancias hoy"
          value={formatCurrency(earnings?.today ?? stats?.earnings_today ?? 0)}
          icon={DollarSign}
          tone="success"
          hint="Pedidos entregados"
        />
        <StatCard
          label="Entregas hoy"
          value={earnings?.deliveries_today ?? stats?.deliveries_completed ?? 0}
          icon={Package}
          tone="default"
          hint={`${earnings?.deliveries_total ?? 0} en total`}
        />
        <StatCard
          label="Rating"
          value={ratingValue > 0 ? ratingValue.toFixed(1) : "—"}
          icon={Star}
          tone="warning"
          hint="Promedio de clientes"
        />
        <StatCard
          label="Eficiencia"
          value={`${efficiency}%`}
          icon={TrendingUp}
          tone={efficiency >= 80 ? "success" : efficiency >= 50 ? "warning" : "danger"}
          hint="Entregas a tiempo"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Desempeño */}
        <section className="card p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="section-title">Tu desempeño</h2>
            <Link
              to="/delivery/ratings"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              Ver calificaciones
            </Link>
          </div>
          <div className="space-y-5">
            <Metric
              icon={Clock}
              label="Puntualidad"
              value={punctuality}
              tone="info"
            />
            <Metric
              icon={Smile}
              label="Satisfacción"
              value={satisfaction}
              tone="success"
            />
            <Metric
              icon={Gauge}
              label="Eficiencia"
              value={efficiency}
              tone="warn"
            />
          </div>
        </section>

        {/* Estado de disponibilidad + ganancias rápidas */}
        <section className="card flex flex-col gap-4 p-6">
          <div>
            <h2 className="section-title mb-3">Disponibilidad</h2>
            <div className="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-success-500" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-success-700">
                  Listo para recibir pedidos
                </p>
                <p className="text-xs text-success-600">
                  Gestiona tu estado desde tus pedidos.
                </p>
              </div>
            </div>
          </div>

          {earnings && (
            <div className="mt-auto rounded-xl bg-surface-muted p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                <Wallet className="h-4 w-4 text-brand-600" />
                Esta semana
              </div>
              <p className="mt-1 font-display text-2xl font-bold text-brand-600">
                {formatCurrency(earnings.this_week)}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                Mes: {formatCurrency(earnings.this_month)}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Accesos rápidos */}
      <section className="mt-6">
        <h2 className="section-title mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            to="/delivery/available"
            icon={Bell}
            tone="brand"
            title="Ver disponibles"
            subtitle="Pedidos esperando repartidor"
          />
          <QuickLink
            to="/delivery/my-orders"
            icon={Package}
            tone="info"
            title="Mis pedidos"
            subtitle="Pedidos activos e historial"
          />
          <QuickLink
            to="/delivery/map"
            icon={MapIcon}
            tone="success"
            title="Mapa"
            subtitle="Ruta y entregas en vivo"
          />
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  tone: "info" | "success" | "warn";
}) {
  const pct = Math.max(0, Math.min(100, value));
  const tones: Record<typeof tone, { bar: string; chip: string; text: string }> = {
    info: {
      bar: "bg-info-500",
      chip: "bg-info-50 text-info-600",
      text: "text-info-700",
    },
    success: {
      bar: "bg-success-500",
      chip: "bg-success-50 text-success-600",
      text: "text-success-700",
    },
    warn: {
      bar: "bg-warn-500",
      chip: "bg-warn-50 text-warn-700",
      text: "text-warn-700",
    },
  };
  const t = tones[tone];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", t.chip)}>
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </span>
        <span className={cn("font-display text-sm font-bold", t.text)}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full transition-all", t.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  tone,
  title,
  subtitle,
}: {
  to: string;
  icon: typeof Bell;
  tone: "brand" | "info" | "success";
  title: string;
  subtitle: string;
}) {
  const tones: Record<typeof tone, string> = {
    brand: "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
    info: "bg-info-50 text-info-600 group-hover:bg-info-100",
    success: "bg-success-50 text-success-600 group-hover:bg-success-100",
  };
  return (
    <Link to={to} className="card-hover group flex items-center gap-4 p-5">
      <span
        className={cn(
          "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition",
          tones[tone],
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink-900 transition group-hover:text-brand-600">
          {title}
        </span>
        <span className="block truncate text-sm text-ink-500">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
    </Link>
  );
}
