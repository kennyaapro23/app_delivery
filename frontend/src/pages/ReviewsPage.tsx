import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageSquare } from "lucide-react";
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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">⭐ Mis reseñas</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-3 text-neutral-500">Aún no has escrito reseñas</p>
          <Link to="/orders" className="mt-4 inline-block text-brand-600 hover:underline">
            Ver mis pedidos para reseñar
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="flex items-center justify-between">
                <Link to={`/orders/${r.order_id}`} className="font-semibold hover:text-brand-600">
                  Pedido #{r.order_id}
                </Link>
                <span className="text-xs text-neutral-500">{formatDate(r.created_at)}</span>
              </div>
              <div className="mt-2">
                <StarRating value={r.rating} readonly size="sm" />
              </div>
              {r.comment && <p className="mt-2 text-sm text-neutral-700">{r.comment}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
