import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ChevronRight } from "lucide-react";
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
    listAllOrders(filter === "all" ? undefined : { status: filter })
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <button onClick={load} className="btn-ghost">Refrescar</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition",
              filter === f.value
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-neutral-500">
          No hay pedidos
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <div>{o.customer_name ?? "—"}</div>
                    <div className="text-xs text-neutral-500">{o.customer_phone ?? ""}</div>
                  </td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatCurrency(o.total)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="inline-flex items-center text-brand-600 hover:underline"
                    >
                      Ver <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
