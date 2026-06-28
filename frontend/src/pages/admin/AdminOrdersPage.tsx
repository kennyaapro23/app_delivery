import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight, RefreshCw } from "lucide-react";
import { listAllOrders } from "@/services/admin-orders";
import { OrderStatusBadge, STATUS_LABELS } from "@/components/OrderStatusBadge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { Order, OrderStatus } from "@/types/api";

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: STATUS_LABELS.pending },
  { value: "accepted", label: STATUS_LABELS.accepted },
  { value: "preparing", label: STATUS_LABELS.preparing },
  { value: "ready", label: STATUS_LABELS.ready },
  { value: "on_the_way", label: STATUS_LABELS.on_the_way },
  { value: "delivered", label: STATUS_LABELS.delivered },
  { value: "canceled", label: STATUS_LABELS.canceled },
];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAllOrders(filter === "all" ? undefined : { status: filter })
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Pedidos
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Gestiona y da seguimiento a todos los pedidos.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refrescar
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "chip",
              filter === f.value &&
                "border-brand-500 bg-brand-500 text-white hover:border-brand-500 hover:bg-brand-500",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="card overflow-hidden">
          <div className="divide-y divide-ink-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-32 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
                <div className="skeleton h-6 w-20 rounded-full" />
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton hidden h-3 w-20 rounded sm:block" />
                <div className="skeleton h-4 w-10 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="text-5xl">📦</div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
            No hay pedidos
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            {filter === "all"
              ? "Aún no se han registrado pedidos."
              : "No hay pedidos con este estado. Prueba con otro filtro."}
          </p>
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} className="btn-secondary mt-5">
              Ver todos
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-ink-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-ink-900">
                      {o.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-800">
                        {o.customer_name ?? "—"}
                      </div>
                      <div className="text-xs text-ink-500">
                        {o.customer_phone ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-900">
                      {formatCurrency(o.total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                      >
                        Ver <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
