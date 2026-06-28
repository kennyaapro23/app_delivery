import { useEffect, useMemo, useState } from "react";
import { Star, AlertCircle } from "lucide-react";
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
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
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

  const sortedReviews = useMemo(
    () =>
      [...reviews].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [reviews],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton mb-6 h-8 w-56 rounded-lg" />
        <div className="skeleton mb-4 h-32 w-full rounded-xl" />
        <div className="skeleton mb-4 h-4 w-40 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="skeleton mt-3 h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
        ⭐ Mis calificaciones
      </h1>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!stats ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warn-50 text-warn-500">
            <Star className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
            Aún no has recibido calificaciones
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            Completa entregas para empezar a recibir reseñas de tus clientes.
          </p>
        </div>
      ) : (
        <>
          <div className="card mb-6 p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center text-center">
                <div className="font-display text-5xl font-bold text-ink-900">
                  {stats.avg.toFixed(1)}
                </div>
                <div className="mt-1">
                  <StarRating value={Math.round(stats.avg)} readonly size="sm" />
                </div>
                <div className="mt-1 text-xs text-ink-500">
                  {stats.total} reseña{stats.total !== 1 && "s"}
                </div>
              </div>
              <div className="w-full flex-1 space-y-2">
                {stats.dist.map((d) => (
                  <div key={d.stars} className="flex items-center gap-3 text-xs">
                    <span className="flex w-7 items-center gap-0.5 font-medium text-ink-700">
                      {d.stars}
                      <Star className="h-3 w-3 fill-warn-400 text-warn-400" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-warn-400 transition-all"
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-ink-500">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="section-title mb-4">Reseñas recientes</h2>
          <div className="space-y-3">
            {sortedReviews.map((r) => (
              <article key={r.id} className="card-hover p-4">
                <div className="flex items-center justify-between gap-3">
                  <StarRating value={r.rating} readonly size="sm" />
                  <span className="text-xs text-ink-500">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-700">
                    {r.comment}
                  </p>
                )}
                <p className="mt-2 text-xs text-ink-400">Pedido #{r.order_id}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
