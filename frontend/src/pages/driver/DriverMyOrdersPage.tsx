import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ChevronRight, Package } from "lucide-react";
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
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const active = orders.filter((o) => !["delivered", "canceled"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "canceled"].includes(o.status));

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
      <h1 className="mb-4 text-xl font-bold">Mis pedidos</h1>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-600">Activos ({active.length})</h2>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center text-sm text-neutral-500">
            <Package className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2">No tienes pedidos asignados</p>
            <Link to="/delivery/available" className="mt-3 inline-block text-brand-600 underline">
              Ver pedidos disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-neutral-600">Historial</h2>
          <div className="space-y-2">
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
      className="card flex items-center justify-between p-4 transition hover:shadow-md"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="font-bold">{order.order_number}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-xs text-neutral-500">{formatDate(order.created_at)}</p>
      </div>
      <div className="flex items-center gap-2 text-right">
        <div>
          <div className="font-semibold">{formatCurrency(order.delivery_fee)}</div>
          <div className="text-xs text-neutral-500">delivery</div>
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-400" />
      </div>
    </Link>
  );
}
