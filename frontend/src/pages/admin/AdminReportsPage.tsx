import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  DollarSign,
  ShoppingBag,
  Receipt,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import { getAdminReports, type AdminReports } from "@/services/dashboard";
import { StatCard } from "@/components/StatCard";
import { cn, formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Helpers de fechas (sin librerías)                                   */
/* ------------------------------------------------------------------ */

function toISODate(d: Date): string {
  // YYYY-MM-DD en hora local (evita corrimientos por UTC).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

/** Etiqueta corta "dd/mm" a partir de un ISO YYYY-MM-DD (sin parse UTC). */
function shortDayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${d}/${m}`;
}

type PresetKey = "today" | "7d" | "30d" | "month";

function presetRange(key: PresetKey): { start: string; end: string } {
  const now = new Date();
  const end = toISODate(now);
  switch (key) {
    case "today":
      return { start: end, end };
    case "7d":
      return { start: toISODate(addDays(now, -6)), end };
    case "30d":
      return { start: toISODate(addDays(now, -29)), end };
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toISODate(first), end };
    }
  }
}

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "month", label: "Este mes" },
];

/* ------------------------------------------------------------------ */
/* Paleta para segmentos (donut / leyendas) usando tokens del DS      */
/* ------------------------------------------------------------------ */

const SEGMENT_COLORS = [
  "var(--rep-brand)",
  "var(--rep-success)",
  "var(--rep-info)",
  "var(--rep-warn)",
  "var(--rep-danger)",
  "var(--rep-ink)",
];

/* Mapeo legible de estados y métodos de pago. */
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  on_the_way: "En camino",
  delivered: "Entregado",
  canceled: "Cancelado",
  cancelled: "Cancelado",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  yape: "Yape",
  plin: "Plin",
  transfer: "Transferencia",
};

function labelStatus(s: string): string {
  return STATUS_LABELS[s] ?? s;
}
function labelPayment(m: string): string {
  return PAYMENT_LABELS[m] ?? m;
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export function AdminReportsPage() {
  const initial = useMemo(() => presetRange("30d"), []);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [data, setData] = useState<AdminReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Evita parpadear el loader completo en recargas posteriores a la primera.
  const firstLoadDone = useRef(false);
  // Guardia de secuencia: solo la respuesta más reciente actualiza el estado.
  const reqSeq = useRef(0);

  const invalidRange = start > end;

  useEffect(() => {
    if (invalidRange) return;
    const seq = ++reqSeq.current;
    if (!firstLoadDone.current) setLoading(true);
    setError(null);
    getAdminReports(start, end)
      .then((d) => {
        if (seq !== reqSeq.current) return;
        setData(d);
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
  }, [start, end, invalidRange]);

  function applyPreset(key: PresetKey) {
    const r = presetRange(key);
    setStart(r.start);
    setEnd(r.end);
  }

  const activePreset = useMemo<PresetKey | null>(() => {
    for (const p of PRESETS) {
      const r = presetRange(p.key);
      if (r.start === start && r.end === end) return p.key;
    }
    return null;
  }, [start, end]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Tokens de color locales mapeados a la paleta del DS */}
      <style>{`
        :root {
          --rep-brand: #ff7e0f;
          --rep-success: #12b76a;
          --rep-info: #2e90fa;
          --rep-warn: #f79009;
          --rep-danger: #f04438;
          --rep-ink: #a8a097;
          --rep-track: #f4f2ee;
        }
      `}</style>

      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
          Reportes
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Analiza ventas, productos y clientes en el rango que elijas.
        </p>
      </header>

      {/* ---- Filtros de fecha ---- */}
      <div className="card mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="label" htmlFor="rep-start">
                Desde
              </label>
              <input
                id="rep-start"
                type="date"
                className="input-base sm:w-44"
                value={start}
                max={end}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="rep-end">
                Hasta
              </label>
              <input
                id="rep-end"
                type="date"
                className="input-base sm:w-44"
                value={end}
                min={start}
                max={toISODate(new Date())}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = activePreset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  aria-pressed={active}
                  className={cn(
                    "chip",
                    active && "border-brand-500 bg-brand-500 text-white hover:border-brand-500 hover:bg-brand-500",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {invalidRange && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            La fecha inicial no puede ser posterior a la fecha final.
          </div>
        )}
      </div>

      {/* ---- Banner de error ---- */}
      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ---- Contenido ---- */}
      {loading ? (
        <ReportsSkeleton />
      ) : !data ? (
        !error && <EmptyState />
      ) : (
        <ReportsContent data={data} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contenido cuando hay datos                                          */
/* ------------------------------------------------------------------ */

function ReportsContent({ data }: { data: AdminReports }) {
  const { summary, daily, top_products, top_customers, by_status, by_payment } = data;

  const hasAnyData =
    summary.orders > 0 ||
    daily.some((d) => d.orders > 0 || d.revenue > 0) ||
    top_products.length > 0 ||
    top_customers.length > 0;

  if (!hasAnyData) return <EmptyState />;

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Ingresos"
          value={formatCurrency(summary.revenue)}
          icon={DollarSign}
          tone="success"
        />
        <StatCard label="Pedidos" value={summary.orders} icon={ShoppingBag} />
        <StatCard
          label="Ticket promedio"
          value={formatCurrency(summary.avg_ticket)}
          icon={Receipt}
        />
        <StatCard
          label="Entregados"
          value={summary.delivered}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Cancelados"
          value={summary.canceled}
          icon={XCircle}
          tone="danger"
        />
      </div>

      {/* Serie diaria de ingresos */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Ingresos por día</h2>
        </div>
        <div className="card p-4 sm:p-6">
          <DailyRevenueChart daily={daily} />
        </div>
      </section>

      {/* Top productos */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Productos más vendidos</h2>
        </div>
        <div className="card p-4 sm:p-6">
          <TopProductsChart products={top_products} />
        </div>
      </section>

      {/* Desgloses por estado y pago */}
      <section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title">Pedidos por estado</h2>
            </div>
            <div className="card p-4 sm:p-6">
              <BreakdownDonut
                items={by_status.map((s) => ({ label: labelStatus(s.status), value: s.count }))}
                emptyLabel="Sin pedidos en este rango"
                valueSuffix="pedidos"
              />
            </div>
          </div>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title">Por método de pago</h2>
            </div>
            <div className="card p-4 sm:p-6">
              <BreakdownDonut
                items={by_payment.map((p) => ({
                  label: labelPayment(p.method),
                  value: p.count,
                  extra: formatCurrency(p.revenue),
                }))}
                emptyLabel="Sin pagos en este rango"
                valueSuffix="pedidos"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Top clientes */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Mejores clientes</h2>
        </div>
        <TopCustomersTable customers={top_customers} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gráfico de barras: ingresos por día (SVG puro)                      */
/* ------------------------------------------------------------------ */

function DailyRevenueChart({ daily }: { daily: AdminReports["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (daily.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-500">
        No hay actividad diaria en este rango.
      </p>
    );
  }

  const max = Math.max(...daily.map((d) => d.revenue), 0);
  const totalRevenue = daily.reduce((acc, d) => acc + d.revenue, 0);

  // Geometría del gráfico.
  const VBW = 760;
  const VBH = 260;
  const padL = 8;
  const padR = 8;
  const padTop = 16;
  const padBottom = 28; // espacio para etiquetas de eje X
  const plotW = VBW - padL - padR;
  const plotH = VBH - padTop - padBottom;
  const n = daily.length;
  const slot = plotW / n;
  // Ancho de barra proporcional, con máximo para pocos días.
  const barW = Math.min(slot * 0.6, 48);

  // Mostrar solo un subconjunto de etiquetas en el eje X para no saturar.
  const labelStep = Math.ceil(n / 12);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-500">
          Total del periodo:{" "}
          <span className="font-semibold text-ink-900">{formatCurrency(totalRevenue)}</span>
        </p>
        <p className="text-xs text-ink-400">
          Pico diario: <span className="font-medium text-ink-600">{formatCurrency(max)}</span>
        </p>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VBW} ${VBH}`}
          className="h-56 w-full"
          role="img"
          aria-label="Gráfico de ingresos por día"
          preserveAspectRatio="none"
        >
          {/* Líneas de cuadrícula horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padTop + plotH * (1 - t);
            return (
              <line
                key={t}
                x1={padL}
                x2={VBW - padR}
                y1={y}
                y2={y}
                stroke="var(--rep-track)"
                strokeWidth={1}
              />
            );
          })}

          {daily.map((d, i) => {
            const h = max > 0 ? (d.revenue / max) * plotH : 0;
            const x = padL + i * slot + (slot - barW) / 2;
            const y = padTop + plotH - h;
            const isHover = hover === i;
            return (
              <g key={d.date}>
                {/* Zona de hover de toda la columna */}
                <rect
                  x={padL + i * slot}
                  y={padTop}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h0) => (h0 === i ? null : h0))}
                />
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, d.revenue > 0 ? 2 : 0)}
                  rx={3}
                  fill="var(--rep-brand)"
                  opacity={isHover ? 1 : 0.85}
                  className="transition-opacity"
                  pointerEvents="none"
                />
                {/* Etiqueta de eje X (subconjunto) */}
                {i % labelStep === 0 && (
                  <text
                    x={padL + i * slot + slot / 2}
                    y={VBH - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#7a7268"
                  >
                    {shortDayLabel(d.date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip simple basado en estado de hover */}
        {hover !== null && daily[hover] && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink-900 px-3 py-2 text-xs text-white shadow-pop"
            style={{ left: `${((hover + 0.5) / n) * 100}%` }}
          >
            <div className="font-semibold">{shortDayLabel(daily[hover].date)}</div>
            <div className="mt-0.5 text-ink-200">
              {formatCurrency(daily[hover].revenue)}
            </div>
            <div className="text-ink-300">{daily[hover].orders} pedidos</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gráfico de barras horizontales: top productos (SVG/HTML)            */
/* ------------------------------------------------------------------ */

function TopProductsChart({ products }: { products: AdminReports["top_products"] }) {
  if (products.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-500">
        No se vendieron productos en este rango.
      </p>
    );
  }

  const max = Math.max(...products.map((p) => p.qty), 1);

  return (
    <ul className="space-y-3">
      {products.map((p) => {
        const pct = (p.qty / max) * 100;
        return (
          <li key={p.product_id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-ink-800">{p.name}</span>
              <span className="shrink-0 text-xs text-ink-500">
                <span className="font-semibold text-ink-900">{p.qty}</span> uds ·{" "}
                {formatCurrency(p.revenue)}
              </span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-ink-100"
              role="img"
              aria-label={`${p.name}: ${p.qty} unidades`}
            >
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Donut SVG con leyenda (estados / pagos)                             */
/* ------------------------------------------------------------------ */

function BreakdownDonut({
  items,
  emptyLabel,
  valueSuffix,
}: {
  items: Array<{ label: string; value: number; extra?: string }>;
  emptyLabel: string;
  valueSuffix: string;
}) {
  const total = items.reduce((acc, it) => acc + it.value, 0);

  if (items.length === 0 || total === 0) {
    return <p className="py-10 text-center text-sm text-ink-500">{emptyLabel}</p>;
  }

  // Geometría del donut.
  const size = 160;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  const segments = items.map((it, i) => {
    const dash = (it.value / total) * circ;
    // Desplazamiento acumulado de los segmentos previos (sin mutar variables).
    const preceding = items
      .slice(0, i)
      .reduce((acc, prev) => acc + (prev.value / total) * circ, 0);
    return {
      key: it.label,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      dash,
      gap: circ - dash,
      offset: -preceding,
    };
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-40 w-40 shrink-0 -rotate-90"
        role="img"
        aria-label="Distribución"
      >
        {/* Pista de fondo */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rep-track)" strokeWidth={stroke} />
        {segments.map((s) => (
          <circle
            key={s.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
          />
        ))}
        {/* Total al centro (contrarrestamos la rotación del SVG) */}
        <g transform={`rotate(90 ${cx} ${cy})`}>
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fontSize={22}
            fontWeight={700}
            fill="#1a1714"
          >
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#7a7268">
            {valueSuffix}
          </text>
        </g>
      </svg>

      {/* Leyenda */}
      <ul className="w-full flex-1 space-y-2">
        {items.map((it, i) => {
          const pct = Math.round((it.value / total) * 100);
          return (
            <li key={it.label} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-ink-700">{it.label}</span>
              <span className="shrink-0 text-xs text-ink-500">
                {it.extra && <span className="mr-2">{it.extra}</span>}
                <span className="font-semibold text-ink-900">{it.value}</span>{" "}
                <span className="text-ink-400">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabla de top clientes                                               */
/* ------------------------------------------------------------------ */

function TopCustomersTable({ customers }: { customers: AdminReports["top_customers"] }) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-12 text-center">
        <div className="text-4xl">🧑‍🍳</div>
        <h3 className="mt-3 font-display text-base font-bold text-ink-800">Aún no hay clientes</h3>
        <p className="mt-1 text-sm text-ink-500">No hubo compras en el rango seleccionado.</p>
      </div>
    );
  }

  const sorted = [...customers].sort((a, b) => b.spend - a.spend);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Pedidos</th>
              <th className="px-4 py-3 text-right">Gasto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {sorted.map((c, i) => (
              <tr key={c.user_id} className="transition hover:bg-ink-50">
                <td className="px-4 py-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-ink-900">{c.name}</td>
                <td className="px-4 py-3 text-right text-ink-700">{c.orders}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink-900">
                  {formatCurrency(c.spend)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estados: skeleton y vacío                                           */
/* ------------------------------------------------------------------ */

function ReportsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card space-y-3 p-5">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-7 w-1/2 rounded" />
          </div>
        ))}
      </div>
      <div className="card p-6">
        <div className="skeleton mb-4 h-4 w-40 rounded" />
        <div className="skeleton h-56 w-full rounded-xl" />
      </div>
      <div className="card p-6">
        <div className="skeleton mb-4 h-4 w-48 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-6 w-full rounded" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card flex items-center gap-5 p-6">
            <div className="skeleton h-40 w-40 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="skeleton h-4 w-full rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <BarChart3 className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
        No hay datos en este rango
      </h3>
      <p className="mt-1 text-sm text-ink-500">
        Prueba con otro rango de fechas o un preset distinto.
      </p>
    </div>
  );
}
