import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { getOrder } from "@/services/orders";
import { updateOrderStatus } from "@/services/admin-orders";
import {
  OrderStatusBadge,
  STATUS_LABELS,
  NEXT_STATUSES_ADMIN,
} from "@/components/OrderStatusBadge";
import { LiveOrderMap } from "@/components/LiveOrderMap";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { Order, OrderStatus } from "@/types/api";

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Ref para descartar respuestas que llegan después de cambiar de pedido o de
  // desmontar el componente. Sin esto, un `setOrder` tardío sobrescribe datos
  // frescos o pinta sobre un componente desmontado (warning de React).
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  async function loadOrder(showLoading = true) {
    if (!id) return;
    if (showLoading) setLoading(true);
    try {
      const o = await getOrder(Number(id));
      if (!aliveRef.current) return;
      setOrder(o);
    } catch (e) {
      if (!aliveRef.current) return;
      setError(getErrorMessage(e));
    } finally {
      if (showLoading && aliveRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder(true);
  }, [id]);

  // Auto-refresh mientras el pedido esté activo (cada 15s).
  useEffect(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (order && !["delivered", "canceled"].includes(order.status)) {
      pollRef.current = window.setInterval(() => loadOrder(false), 15000);
    }
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [order?.status]);

  async function moveTo(next: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await updateOrderStatus(order.id, next);
      setOrder(updated);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }
  if (error || !order) {
    return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  const allowed = NEXT_STATUSES_ADMIN[order.status];
  const isActive = !["delivered", "canceled"].includes(order.status);

  return (
    <div>
      <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" /> Pedidos
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pedido {order.order_number}</h1>
          <p className="text-sm text-neutral-500">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <button
            onClick={() => loadOrder(false)}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            title="Refrescar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isActive && (
            <section>
              <h2 className="mb-3 font-semibold">📡 Seguimiento en vivo</h2>
              <ErrorBoundary>
                <LiveOrderMap orderId={order.id} refreshSeconds={10} height={300} />
              </ErrorBoundary>
            </section>
          )}

          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Productos</h2>
            <ul className="divide-y divide-neutral-100">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{it.quantity}× {it.product_name}</p>
                    <p className="text-xs text-neutral-500">{formatCurrency(it.unit_price)} c/u</p>
                  </div>
                  <span className="font-semibold">{formatCurrency(it.subtotal)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Seguimiento</h2>
            <ol className="relative space-y-3 border-l-2 border-neutral-200 pl-6">
              {order.timeline.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </span>
                  <p className="text-sm font-medium">{ev.title}</p>
                  {ev.description && <p className="text-xs text-neutral-500">{ev.description}</p>}
                  <p className="text-xs text-neutral-400">{formatDate(ev.timestamp)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Cliente</h2>
            <p className="text-sm">{order.customer_name ?? "—"}</p>
            <p className="text-xs text-neutral-500">{order.customer_phone ?? ""}</p>
            <p className="mt-3 text-xs text-neutral-500">Dirección:</p>
            <p className="text-sm">{order.delivery_address}</p>
            {order.driver_name && (
              <>
                <p className="mt-3 text-xs text-neutral-500">Repartidor:</p>
                <p className="text-sm">{order.driver_name}</p>
              </>
            )}
            <p className="mt-3 text-xs text-neutral-500">Pago:</p>
            <p className="text-sm capitalize">{order.payment_method}</p>
          </section>

          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Resumen</h2>
            <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
            <Row label="Delivery" value={formatCurrency(order.delivery_fee)} />
            <Row label="IGV" value={formatCurrency(order.tax)} />
            <div className="my-2 border-t border-neutral-200" />
            <Row label="Total" value={formatCurrency(order.total)} bold />
          </section>

          {allowed.length > 0 ? (
            <section className="card p-6">
              <h2 className="mb-3 font-semibold">Cambiar estado</h2>
              <div className="space-y-2">
                {allowed.map((next) => (
                  <button
                    key={next}
                    disabled={updating}
                    onClick={() => moveTo(next)}
                    className={
                      next === "canceled" ? "btn-danger w-full" : "btn-primary w-full"
                    }
                  >
                    → {STATUS_LABELS[next]}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            ["ready", "on_the_way"].includes(order.status) && (
              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                🛵 El pedido está {order.status === "ready" ? "listo para entrega" : "en ruta"}. <br />
                Ahora le toca al <strong>repartidor</strong> avanzar el estado.
              </section>
            )
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "text-base font-bold" : ""}`}>
      <span className={bold ? "" : "text-neutral-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
