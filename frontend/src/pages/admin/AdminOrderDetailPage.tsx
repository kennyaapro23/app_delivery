import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  MapPin,
  Package,
  Clock,
  User,
  Phone,
  Truck,
  CreditCard,
  Bike,
} from "lucide-react";
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
      // Limpia errores previos: un poll exitoso no debe arrastrar el banner de
      // una falla transitoria anterior.
      setError(null);
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
      // Descarta la respuesta si el componente se desmontó o se cambió de
      // pedido mientras la petición estaba en vuelo.
      if (!aliveRef.current) return;
      setOrder(updated);
      setError(null);
    } catch (e) {
      if (!aliveRef.current) return;
      setError(getErrorMessage(e));
    } finally {
      if (aliveRef.current) setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton mb-4 h-4 w-20 rounded" />
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-8 w-56 rounded-lg" />
            <div className="skeleton h-4 w-40 rounded" />
          </div>
          <div className="skeleton h-7 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="skeleton h-72 w-full rounded-xl" />
            <div className="skeleton h-40 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="skeleton h-48 w-full rounded-xl" />
            <div className="skeleton h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de error completa SOLO cuando falla la carga inicial (no hay pedido).
  // Si ya hay un pedido cargado, los errores se muestran como banner inline para
  // no destruir el contexto (mapa, items, timeline, botones de estado).
  if (!order) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link
          to="/admin/orders"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ink-600 transition hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" /> Pedidos
        </Link>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-danger-200 bg-danger-50 px-6 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-danger-500" />
          <h3 className="mt-4 font-display text-lg font-bold text-danger-700">
            No se pudo cargar el pedido
          </h3>
          <p className="mt-1 text-sm text-danger-700">
            {error ?? "El pedido no existe o no está disponible."}
          </p>
          <button onClick={() => loadOrder(true)} className="btn-secondary mt-5">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const allowed = NEXT_STATUSES_ADMIN[order.status];
  const isActive = !["delivered", "canceled"].includes(order.status);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/admin/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-600 transition hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Pedidos
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Pedido {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <button
            onClick={() => loadOrder(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            title="Refrescar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Banner inline: errores transitorios (poll fallido o cambio de estado)
          no deben borrar el contexto del pedido ya cargado. */}
      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isActive && (
            <section>
              <h2 className="section-title mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-500" /> Seguimiento en vivo
              </h2>
              <div className="card overflow-hidden">
                <ErrorBoundary>
                  <LiveOrderMap orderId={order.id} refreshSeconds={10} height={300} />
                </ErrorBoundary>
              </div>
            </section>
          )}

          <section className="card p-6">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-500" /> Productos
            </h2>
            <ul className="divide-y divide-ink-100">
              {order.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                      {it.quantity}×
                    </span>
                    <div>
                      <p className="font-medium text-ink-900">{it.product_name}</p>
                      <p className="text-xs text-ink-500">
                        {formatCurrency(it.unit_price)} c/u
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-ink-900">
                    {formatCurrency(it.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-500" /> Seguimiento
            </h2>
            <ol className="relative space-y-4 border-l-2 border-ink-200 pl-6">
              {order.timeline.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </span>
                  <p className="text-sm font-medium text-ink-900">{ev.title}</p>
                  {ev.description && (
                    <p className="text-xs text-ink-500">{ev.description}</p>
                  )}
                  <p className="text-xs text-ink-400">{formatDate(ev.timestamp)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-brand-500" /> Cliente
            </h2>
            <p className="text-sm font-medium text-ink-900">
              {order.customer_name ?? "—"}
            </p>
            {order.customer_phone && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
              </p>
            )}

            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-400">
              Dirección
            </p>
            <p className="mt-0.5 flex items-start gap-1.5 text-sm text-ink-700">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
              {order.delivery_address}
            </p>

            {order.driver_name && (
              <>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-400">
                  Repartidor
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-700">
                  <Truck className="h-3.5 w-3.5 text-ink-400" /> {order.driver_name}
                </p>
              </>
            )}

            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-400">
              Pago
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm capitalize text-ink-700">
              <CreditCard className="h-3.5 w-3.5 text-ink-400" />{" "}
              {order.payment_method}
            </p>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-4">Resumen</h2>
            <div className="space-y-2">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              <Row label="Delivery" value={formatCurrency(order.delivery_fee)} />
              <Row label="IGV" value={formatCurrency(order.tax)} />
            </div>
            <div className="my-3 border-t border-ink-200" />
            <Row label="Total" value={formatCurrency(order.total)} bold />
          </section>

          {allowed.length > 0 ? (
            <section className="card p-6">
              <h2 className="section-title mb-4">Cambiar estado</h2>
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
                    {updating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>→ {STATUS_LABELS[next]}</>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            ["ready", "on_the_way"].includes(order.status) && (
              <section className="flex items-start gap-2 rounded-lg border border-info-200 bg-info-50 p-4 text-sm text-info-700">
                <Bike className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  El pedido está{" "}
                  {order.status === "ready" ? "listo para entrega" : "en ruta"}. Ahora
                  le toca al <strong>repartidor</strong> avanzar el estado.
                </span>
              </section>
            )
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between text-sm ${
        bold ? "text-base font-bold text-ink-900" : ""
      }`}
    >
      <span className={bold ? "" : "text-ink-600"}>{label}</span>
      <span className={bold ? "" : "font-medium text-ink-900"}>{value}</span>
    </div>
  );
}
