import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Package, AlertCircle } from "lucide-react";
import { listMyOrders } from "@/services/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { Order } from "@/types/api";

export function DriverMyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyOrders()
      .then((d) => setOrders(Array.isArray(d?.orders) ? d.orders : []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const active = orders.filter((o) => !["delivered", "canceled"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "canceled"].includes(o.status));

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton mb-6 h-8 w-48 rounded-lg" />
        <div className="skeleton mb-3 h-4 w-24 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card flex items-center justify-between p-4">
              <div className="space-y-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
              </div>
              <div className="skeleton h-8 w-16 rounded" />
            </div>
          ))}
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
        Mis pedidos
      </h1>

      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="section-title">Activos</h2>
          <span className="badge badge-info">{active.length}</span>
        </div>
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
              No tienes pedidos asignados
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Acepta un pedido disponible para empezar a entregar.
            </p>
            <Link to="/delivery/available" className="btn-secondary mt-5">
              Ver pedidos disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="section-title mb-4">Historial</h2>
          <div className="space-y-3">
            {past.slice(0, 20).map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <Link
      to={`/delivery/my-orders/${order.id}`}
      className="card-hover group flex items-center justify-between gap-4 p-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink-900 transition group-hover:text-brand-600">
            {order.order_number}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-xs text-ink-500">{formatDate(order.created_at)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-right">
        <div>
          <div className="font-display text-base font-bold text-brand-600">
            {formatCurrency(order.delivery_fee)}
          </div>
          <div className="text-xs text-ink-500">delivery</div>
        </div>
        <ChevronRight className="h-4 w-4 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
      </div>
    </Link>
  );
}
