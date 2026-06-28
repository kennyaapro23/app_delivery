import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  CreditCard,
  XCircle,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  Star,
  X,
  FileDown,
  Radio,
  Package,
  ClipboardList,
} from "lucide-react";
import { cancelOrder, downloadInvoice, getOrder } from "@/services/orders";
import { createReview } from "@/services/reviews";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { StarRating } from "@/components/StarRating";
import { LiveOrderMap } from "@/components/LiveOrderMap";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Order } from "@/types/api";

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getOrder(Number(id))
      .then((data) => {
        if (!cancelled) setOrder(data);
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
  }, [id]);

  async function handleCancel() {
    if (!order) return;
    if (!confirm("¿Cancelar este pedido?")) return;
    setCanceling(true);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCanceling(false);
    }
  }

  async function handleDownloadInvoice() {
    if (!order) return;
    setDownloadingInvoice(true);
    try {
      await downloadInvoice(order.id, order.order_number);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDownloadingInvoice(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await createReview({
        order_id: order.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSubmitted(true);
      setShowReview(false);
    } catch (err) {
      setReviewError(getErrorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="skeleton mb-6 h-5 w-32 rounded" />
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="skeleton h-8 w-56 rounded" />
            <div className="skeleton h-4 w-40 rounded" />
          </div>
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="skeleton h-72 w-full rounded-xl" />
            <div className="skeleton h-44 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="skeleton h-40 w-full rounded-xl" />
            <div className="skeleton h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 text-danger-500">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-ink-800">
          {error ?? "Pedido no encontrado"}
        </h2>
        <p className="mt-1 text-sm text-ink-500">No pudimos cargar este pedido.</p>
        <Link to="/orders" className="btn-secondary mt-5">
          <ArrowLeft className="h-4 w-4" />
          Volver a mis pedidos
        </Link>
      </div>
    );
  }

  const canCancel = ["pending", "accepted", "preparing"].includes(order.status);
  const canReview = order.status === "delivered" && !reviewSubmitted;
  const isActive = !["delivered", "canceled"].includes(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/orders"
        className="mb-6 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-ink-600 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis pedidos
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Pedido #{order.order_number}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Realizado el {formatDate(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {reviewSubmitted && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>¡Gracias por tu reseña!</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isActive && (
            <section>
              <h2 className="section-title mb-3 flex items-center gap-2">
                <Radio className="h-5 w-5 text-brand-500" />
                Seguimiento en vivo
              </h2>
              <div className="overflow-hidden rounded-xl border border-ink-200 shadow-card">
                <ErrorBoundary>
                  <LiveOrderMap orderId={order.id} refreshSeconds={10} height={300} />
                </ErrorBoundary>
              </div>
            </section>
          )}

          <section className="card p-6">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-500" />
              Productos
            </h2>
            <ul className="divide-y divide-ink-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-brand-50 px-2 text-sm font-bold text-brand-600">
                      {item.quantity}×
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatCurrency(item.unit_price)} c/u
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-ink-900">
                    {formatCurrency(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand-500" />
              Seguimiento
            </h2>
            <ol className="relative space-y-5 border-l-2 border-ink-200 pl-6">
              {order.timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </span>
                  <p className="text-sm font-semibold text-ink-900">{event.title}</p>
                  {event.description && (
                    <p className="text-sm text-ink-500">{event.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-400">{formatDate(event.timestamp)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="section-title mb-3">Resumen</h2>
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              <Row label="Delivery" value={formatCurrency(order.delivery_fee)} />
              <Row label="IGV" value={formatCurrency(order.tax)} />
              <div className="my-2 border-t border-ink-200" />
              <Row label="Total" value={formatCurrency(order.total)} bold />
            </div>
          </section>

          <section className="card space-y-3 p-6 text-sm text-ink-700">
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
              <span>{order.delivery_address}</span>
            </div>
            <div className="flex gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-brand-500" />
              <span className="capitalize">{order.payment_method}</span>
            </div>
            {order.driver_name && (
              <div className="flex gap-2">
                <Phone className="h-4 w-4 shrink-0 text-brand-500" />
                <span>
                  Repartidor: {order.driver_name}
                  {order.driver_phone && ` · ${order.driver_phone}`}
                </span>
              </div>
            )}
          </section>

          <div className="space-y-3">
            <button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="btn-ghost w-full"
            >
              {downloadingInvoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Descargar factura
            </button>

            {canReview && (
              <button onClick={() => setShowReview(true)} className="btn-primary w-full">
                <Star className="h-4 w-4" /> Calificar pedido
              </button>
            )}

            {canCancel && (
              <button onClick={handleCancel} disabled={canceling} className="btn-danger w-full">
                {canceling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Cancelar pedido
              </button>
            )}
          </div>
        </aside>
      </div>

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitReview}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-pop"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink-900">¿Qué te pareció?</h2>
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:bg-ink-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-surface-muted py-5 text-center">
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
              <p className="mt-2 text-sm font-medium text-ink-700">
                {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][reviewRating]}
              </p>
            </div>

            <div>
              <label className="label">Comentario (opcional)</label>
              <textarea
                rows={4}
                className="input-base resize-none"
                placeholder="Cuéntanos cómo fue tu experiencia..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>

            {reviewError && (
              <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setShowReview(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={submittingReview} className="btn-primary">
                {submittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                Publicar reseña
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? "text-base font-bold text-ink-900" : ""
      }`}
    >
      <span className={bold ? "" : "text-ink-500"}>{label}</span>
      <span className={bold ? "font-display text-brand-600" : "font-medium text-ink-900"}>
        {value}
      </span>
    </div>
  );
}
