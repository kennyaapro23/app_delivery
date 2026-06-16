import { useEffect, useMemo, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { listDriverReviews, type Review } from "@/services/reviews";
import { useAuthStore } from "@/store/auth";
import { StarRating } from "@/components/StarRating";
import { formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

export function DriverRatingsPage() {
  const userId = useAuthStore((s) => s.userId);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    listDriverReviews(userId)
      .then(setReviews)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [userId]);

  const stats = useMemo(() => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / reviews.length;
    const dist = [5, 4, 3, 2, 1].map((stars) => {
      const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
      return { stars, count, pct: (count / reviews.length) * 100 };
    });
    return { avg, total: reviews.length, dist };
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">⭐ Mis calificaciones</h1>

      {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!stats ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-neutral-500">
          Aún no has recibido calificaciones
        </div>
      ) : (
        <>
          <div className="card mb-4 p-5">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{stats.avg.toFixed(1)}</div>
                <StarRating value={Math.round(stats.avg)} readonly size="sm" />
                <div className="mt-1 text-xs text-neutral-500">
                  {stats.total} reseña{stats.total !== 1 && "s"}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                {stats.dist.map((d) => (
                  <div key={d.stars} className="flex items-center gap-2 text-xs">
                    <span className="flex w-6 items-center gap-0.5">
                      {d.stars} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-yellow-400" style={{ width: `${d.pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-neutral-500">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="mb-2 text-sm font-semibold text-neutral-600">Reseñas recientes</h2>
          <div className="space-y-3">
            {reviews
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((r) => (
                <article key={r.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <StarRating value={r.rating} readonly size="sm" />
                    <span className="text-xs text-neutral-500">{formatDate(r.created_at)}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-neutral-700">{r.comment}</p>}
                  <p className="mt-2 text-xs text-neutral-400">Pedido #{r.order_id}</p>
                </article>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
