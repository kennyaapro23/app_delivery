import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Package } from "lucide-react";
import { listMyOrders } from "@/services/orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import type { Order } from "@/types/api";

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyOrders()
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">📦 Mis pedidos</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-3 text-neutral-500">Aún no tienes pedidos</p>
          <Link to="/" className="btn-primary mt-4 inline-flex">
            Hacer mi primer pedido
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="card flex items-center justify-between p-5 transition hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold">Pedido #{order.order_number}</h3>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {formatDate(order.created_at)} · {order.items.length} producto
                  {order.items.length !== 1 && "s"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{formatCurrency(order.total)}</div>
                <div className="text-xs text-neutral-500 capitalize">{order.payment_method}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
