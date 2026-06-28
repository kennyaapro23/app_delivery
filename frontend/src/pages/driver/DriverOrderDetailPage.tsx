import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Phone, CreditCard, CheckCircle2, Truck, Navigation } from "lucide-react";
import { getOrder } from "@/services/orders";
import { updateOrderStatus } from "@/services/admin-orders";
import { completeDelivery } from "@/services/delivery";
import {
  OrderStatusBadge,
  STATUS_LABELS,
} from "@/components/OrderStatusBadge";
import { LiveOrderMap } from "@/components/LiveOrderMap";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { Order } from "@/types/api";

// Acepta enteros y decimales opcionales para no ocultar el mapa/ruta cuando el
// backend envía coords sin decimales (p.ej. "(-12, -77)").
const COORDS_RE = /\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/;

export function DriverOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const orderId = Number(id);

    const load = (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      getOrder(orderId)
        .then((o) => {
          if (aliveRef.current) setOrder(o);
        })
        .catch((e) => {
          if (aliveRef.current) setError(getErrorMessage(e));
        })
        .finally(() => {
          if (showLoading && aliveRef.current) setLoading(false);
        });
    };

    load(true);
    return () => {};
  }, [id]);

  // Auto-refresh cada 10s mientras el pedido siga activo. Sin esto, el
  // repartidor no veía que admin marcó el pedido como `ready` hasta refrescar
  // manualmente. Se detiene cuando el pedido ya fue entregado o cancelado.
  useEffect(() => {
    if (!id || !order) return;
    if (["delivered", "canceled"].includes(order.status)) return;
    const orderId = Number(id);
    const pollId = window.setInterval(() => {
      getOrder(orderId)
        .then((o) => {
          if (aliveRef.current) setOrder(o);
        })
        .catch(() => {});
    }, 10000);
    return () => window.clearInterval(pollId);
  }, [id, order?.status]);

  async function pickUp() {
    if (!order) return;
    setUpdating(true);
    try {
      // ready → on_the_way (PATCH /orders/:id/status — driver autorizado)
      const updated = await updateOrderStatus(order.id, "on_the_way");
      setOrder(updated);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUpdating(false);
    }
  }

  async function complete() {
    if (!order) return;
    setUpdating(true);
    try {
      await completeDelivery(order.id);
      // Refresca el pedido para ver timeline actualizado
      const fresh = await getOrder(order.id);
      setOrder(fresh);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton mb-4 h-4 w-28 rounded" />
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-7 w-44 rounded" />
            <div className="skeleton h-3 w-28 rounded" />
          </div>
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
        <div className="skeleton mb-4 h-64 w-full rounded-2xl" />
        <div className="skeleton mb-4 h-40 w-full rounded-xl" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="text-5xl">🛵</div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
            {error ?? "Pedido no encontrado"}
          </h3>
          <p className="mt-1 text-sm text-ink-500">No pudimos cargar este pedido.</p>
          <Link to="/delivery/my-orders" className="btn-secondary mt-5">
            <ArrowLeft className="h-4 w-4" /> Volver a mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  const canPickUp = order.status === "ready";
  const canDeliver = order.status === "on_the_way";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/delivery/my-orders"
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-ink-600 transition hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" /> Mis pedidos
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Pedido {order.order_number}
          </h1>
          <p className="mt-1 text-xs text-ink-500">{formatDate(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Mapa con la ruta hacia el cliente */}
      {(() => {
        const m = order.delivery_address.match(COORDS_RE);
        if (!m) return null;
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
        const wazeUrl = `https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`;
        return (
          <section className="mb-4">
            <h2 className="section-title mb-3">📍 Ruta hacia el cliente</h2>
            <div className="overflow-hidden rounded-2xl border border-ink-200 shadow-card">
              <ErrorBoundary>
                <LiveOrderMap orderId={order.id} refreshSeconds={10} height={260} />
              </ErrorBoundary>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost !text-xs">
                <Navigation className="h-3.5 w-3.5" /> Google Maps
              </a>
              <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost !text-xs">
                <Navigation className="h-3.5 w-3.5" /> Waze
              </a>
            </div>
          </section>
        );
      })()}

      <section className="card mb-4 p-5">
        <h2 className="section-title mb-4">Cliente</h2>
        <p className="text-base font-semibold text-ink-900">{order.customer_name}</p>
        {order.customer_phone && (
          <a
            href={`tel:${order.customer_phone}`}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-brand-600 transition hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <Phone className="h-3.5 w-3.5" />
            {order.customer_phone}
          </a>
        )}

        <div className="mt-4 flex items-start gap-2 text-sm text-ink-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <span>{order.delivery_address}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-700">
          <CreditCard className="h-4 w-4 shrink-0 text-ink-400" />
          <span className="capitalize">{order.payment_method}</span>
          {order.payment_method === "efectivo" && (
            <span className="badge badge-warn">Cobrar {formatCurrency(order.total)}</span>
          )}
        </div>
        {order.notes && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warn-200 bg-warn-50 px-3 py-2.5 text-xs text-warn-700">
            <span className="shrink-0">📝</span>
            <span>{order.notes}</span>
          </div>
        )}
      </section>

      <section className="card mb-4 p-5">
        <h2 className="section-title mb-4">Productos</h2>
        <ul className="divide-y divide-ink-100 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-ink-700">
                <span className="font-semibold text-ink-900">{it.quantity}×</span> {it.product_name}
              </span>
              <span className="shrink-0 font-medium text-ink-900">{formatCurrency(it.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="text-sm text-ink-500">Total a cobrar</span>
          <span className="font-display text-2xl font-bold text-ink-900">{formatCurrency(order.total)}</span>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-4">Seguimiento</h2>
        <ol className="relative space-y-4 border-l-2 border-ink-200 pl-6 text-sm">
          {order.timeline.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </span>
              <p className="font-medium text-ink-900">{ev.title}</p>
              <p className="text-xs text-ink-400">{formatDate(ev.timestamp)}</p>
            </li>
          ))}
        </ol>
      </section>

      {canPickUp && (
        <button onClick={pickUp} disabled={updating} className="btn-primary mt-6 w-full">
          {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
          Recoger y salir en ruta → {STATUS_LABELS.on_the_way}
        </button>
      )}
      {canDeliver && (
        <button onClick={complete} disabled={updating} className="btn-primary mt-6 w-full">
          {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Marcar como entregado
        </button>
      )}
    </div>
  );
}
