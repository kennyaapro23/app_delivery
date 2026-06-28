import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight, Package, ShoppingBag } from "lucide-react";
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
    let cancelled = false;
    listMyOrders()
      .then((data) => {
        if (!cancelled) setOrders(data.orders);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Package className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Mis pedidos
          </h1>
          <p className="text-sm text-ink-500">Revisa el estado de tus compras</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card flex items-center justify-between gap-4 p-5">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-5 w-32 rounded" />
                  <div className="skeleton h-5 w-20 rounded-full" />
                </div>
                <div className="skeleton h-3 w-48 rounded" />
              </div>
              <div className="space-y-2 text-right">
                <div className="skeleton ml-auto h-5 w-20 rounded" />
                <div className="skeleton ml-auto h-3 w-14 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
            Aún no tienes pedidos
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            Cuando hagas tu primer pedido aparecerá aquí.
          </p>
          <Link to="/" className="btn-primary mt-5">
            Hacer mi primer pedido
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="card-hover group flex items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-base font-semibold leading-tight text-ink-900 transition group-hover:text-brand-600">
                    Pedido #{order.order_number}
                  </h3>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {formatDate(order.created_at)} · {order.items.length} producto
                  {order.items.length !== 1 && "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-display text-lg font-bold text-brand-600">
                    {formatCurrency(order.total)}
                  </div>
                  <div className="text-xs capitalize text-ink-400">{order.payment_method}</div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
