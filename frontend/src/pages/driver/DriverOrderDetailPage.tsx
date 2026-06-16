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

const COORDS_RE = /\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;

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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="text-center">
        <p className="text-red-600">{error ?? "Pedido no encontrado"}</p>
        <Link to="/delivery/my-orders" className="mt-3 inline-block text-brand-600 underline">
          Volver
        </Link>
      </div>
    );
  }

  const canPickUp = order.status === "ready";
  const canDeliver = order.status === "on_the_way";

  return (
    <div>
      <Link to="/delivery/my-orders" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" /> Mis pedidos
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pedido {order.order_number}</h1>
          <p className="text-xs text-neutral-500">{formatDate(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Mapa con la ruta hacia el cliente */}
      {(() => {
        const m = order.delivery_address.match(COORDS_RE);
        if (!m) return null;
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
        const wazeUrl = `https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`;
        return (
          <section className="mb-4">
            <h2 className="mb-2 text-sm font-semibold">📍 Ruta hacia el cliente</h2>
            <ErrorBoundary>
              <LiveOrderMap orderId={order.id} refreshSeconds={10} height={260} />
            </ErrorBoundary>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
                 className="btn-ghost !text-xs">
                <Navigation className="h-3.5 w-3.5" /> Abrir en Google Maps
              </a>
              <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
                 className="btn-ghost !text-xs">
                <Navigation className="h-3.5 w-3.5" /> Abrir en Waze
              </a>
            </div>
          </section>
        );
      })()}

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Cliente</h2>
        <p className="font-medium">{order.customer_name}</p>
        {order.customer_phone && (
          <a href={`tel:${order.customer_phone}`} className="mt-1 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <Phone className="h-3 w-3" />
            {order.customer_phone}
          </a>
        )}

        <div className="mt-3 flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
          <span>{order.delivery_address}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-neutral-400" />
          <span className="capitalize">{order.payment_method}</span>
          {order.payment_method === "efectivo" && (
            <span className="text-xs text-orange-600">· Cobrar {formatCurrency(order.total)}</span>
          )}
        </div>
        {order.notes && (
          <p className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            📝 {order.notes}
          </p>
        )}
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Productos</h2>
        <ul className="divide-y divide-neutral-100 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between py-2">
              <span>{it.quantity}× {it.product_name}</span>
              <span className="font-medium">{formatCurrency(it.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-neutral-100 pt-3 text-right text-sm">
          <div className="text-neutral-500">Total a cobrar:</div>
          <div className="text-lg font-bold">{formatCurrency(order.total)}</div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Seguimiento</h2>
        <ol className="relative space-y-3 border-l-2 border-neutral-200 pl-6 text-sm">
          {order.timeline.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </span>
              <p className="font-medium">{ev.title}</p>
              <p className="text-xs text-neutral-400">{formatDate(ev.timestamp)}</p>
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
