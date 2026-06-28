import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, MessageSquare, Star } from "lucide-react";
import { listMyReviews, type Review } from "@/services/reviews";
import { StarRating } from "@/components/StarRating";
import { formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyReviews()
      .then(setReviews)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warn-50 text-warn-600">
            <Star className="h-5 w-5 fill-current" />
          </span>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Mis reseñas
          </h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="mt-3 skeleton h-4 w-32 rounded" />
              <div className="mt-3 space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warn-50 text-warn-600">
          <Star className="h-5 w-5 fill-current" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Mis reseñas
          </h1>
          {reviews.length > 0 && (
            <p className="mt-0.5 text-sm text-ink-500">
              {reviews.length} {reviews.length === 1 ? "reseña publicada" : "reseñas publicadas"}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warn-50">
            <MessageSquare className="h-10 w-10 text-warn-400" />
          </div>
          <h3 className="mt-5 font-display text-lg font-bold text-ink-800">
            Aún no has escrito reseñas
          </h3>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            Cuéntanos qué te pareció tu pedido. Tu opinión ayuda a otros a
            elegir mejor.
          </p>
          <Link to="/orders" className="btn-secondary mt-5">
            Ver mis pedidos para reseñar
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <article key={r.id} className="card-hover p-5">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to={`/orders/${r.order_id}`}
                  className="text-base font-semibold text-ink-900 transition hover:text-brand-600"
                >
                  Pedido #{r.order_id}
                </Link>
                <span className="text-xs text-ink-400">
                  {formatDate(r.created_at)}
                </span>
              </div>
              <div className="mt-2">
                <StarRating value={r.rating} readonly size="sm" />
              </div>
              {r.comment && (
                <p className="mt-3 text-sm leading-relaxed text-ink-700">
                  {r.comment}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
