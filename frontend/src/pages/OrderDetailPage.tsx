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
  Star,
  X,
  FileDown,
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
    setLoading(true);
    getOrder(Number(id))
      .then(setOrder)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-red-600">{error ?? "Pedido no encontrado"}</p>
        <Link to="/orders" className="mt-4 inline-block text-brand-600 hover:underline">
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
      <Link to="/orders" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" />
        Mis pedidos
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pedido #{order.order_number}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Realizado el {formatDate(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {reviewSubmitted && (
        <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ✅ ¡Gracias por tu reseña!
        </div>
      )}

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
            <h2 className="mb-4 font-semibold">Productos</h2>
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {item.quantity}× {item.product_name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatCurrency(item.unit_price)} c/u
                    </p>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-semibold">Seguimiento</h2>
            <ol className="relative space-y-4 border-l-2 border-neutral-200 pl-6">
              {order.timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </span>
                  <p className="font-medium">{event.title}</p>
                  {event.description && (
                    <p className="text-sm text-neutral-500">{event.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-400">{formatDate(event.timestamp)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Resumen</h2>
            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              <Row label="Delivery" value={formatCurrency(order.delivery_fee)} />
              <Row label="IGV" value={formatCurrency(order.tax)} />
              <div className="my-2 border-t border-neutral-200" />
              <Row label="Total" value={formatCurrency(order.total)} bold />
            </div>
          </section>

          <section className="card space-y-3 p-6 text-sm">
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-neutral-400" />
              <span>{order.delivery_address}</span>
            </div>
            <div className="flex gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="capitalize">{order.payment_method}</span>
            </div>
            {order.driver_name && (
              <div className="flex gap-2">
                <Phone className="h-4 w-4 shrink-0 text-neutral-400" />
                <span>
                  Repartidor: {order.driver_name}
                  {order.driver_phone && ` · ${order.driver_phone}`}
                </span>
              </div>
            )}
          </section>

          <button
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className="btn-ghost w-full"
          >
            {downloadingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Descargar factura
          </button>

          {canReview && (
            <button onClick={() => setShowReview(true)} className="btn-primary w-full">
              <Star className="h-4 w-4" /> Calificar pedido
            </button>
          )}

          {canCancel && (
            <button onClick={handleCancel} disabled={canceling} className="btn-danger w-full">
              {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancelar pedido
            </button>
          )}
        </aside>
      </div>

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmitReview} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">¿Qué te pareció?</h2>
              <button type="button" onClick={() => setShowReview(false)} className="rounded-lg p-2 hover:bg-neutral-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-center">
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
              <p className="mt-2 text-sm text-neutral-500">
                {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][reviewRating]}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Comentario (opcional)</label>
              <textarea
                rows={4}
                className="input-base resize-none"
                placeholder="Cuéntanos cómo fue tu experiencia..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>

            {reviewError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{reviewError}</div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setShowReview(false)}>Cancelar</button>
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
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold" : ""}`}>
      <span className={bold ? "" : "text-neutral-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
