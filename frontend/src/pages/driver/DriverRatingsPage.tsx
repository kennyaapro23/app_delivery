import { useEffect, useMemo, useState } from "react";
import {
  Star,
  AlertCircle,
  MessageSquare,
  Smile,
  ThumbsUp,
  Award,
} from "lucide-react";
import { listDriverReviews, type Review } from "@/services/reviews";
import { useAuthStore } from "@/store/auth";
import { StarRating } from "@/components/StarRating";
import { formatDate, cn } from "@/lib/utils";
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
    // Métricas derivadas (sin llamadas extra): satisfacción global, reseñas
    // positivas (4-5★) y proporción de excelencia (5★).
    const positive = reviews.filter((r) => r.rating >= 4).length;
    const excellent = reviews.filter((r) => Math.round(r.rating) === 5).length;
    const withComment = reviews.filter((r) => r.comment && r.comment.trim()).length;
    const metrics = [
      {
        key: "satisfaction",
        label: "Satisfacción",
        pct: Math.round((avg / 5) * 100),
        icon: Smile,
        tone: "success" as const,
      },
      {
        key: "positive",
        label: "Reseñas positivas",
        pct: Math.round((positive / reviews.length) * 100),
        icon: ThumbsUp,
        tone: "info" as const,
      },
      {
        key: "excellent",
        label: "Excelencia (5★)",
        pct: Math.round((excellent / reviews.length) * 100),
        icon: Award,
        tone: "warn" as const,
      },
    ];
    return { avg, total: reviews.length, dist, metrics, withComment };
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="skeleton h-44 w-full rounded-xl" />
          <div className="skeleton h-44 w-full rounded-xl lg:col-span-2" />
        </div>
        <div className="skeleton mb-4 mt-6 h-4 w-40 rounded" />
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
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Rating promedio en grande */}
            <div className="card flex flex-col items-center justify-center p-6 text-center">
              <div className="font-display text-6xl font-extrabold leading-none text-ink-900">
                {stats.avg.toFixed(1)}
              </div>
              <div className="mt-3">
                <StarRating value={Math.round(stats.avg)} readonly size="lg" />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                <MessageSquare className="h-3.5 w-3.5" />
                {stats.total} reseña{stats.total !== 1 && "s"}
                {stats.withComment > 0 && (
                  <span className="text-ink-400">
                    · {stats.withComment} con comentario
                  </span>
                )}
              </div>
            </div>

            {/* Métricas con barras de progreso + distribución */}
            <div className="card p-6 lg:col-span-2">
              <h2 className="section-title mb-5">Tus métricas</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {stats.metrics.map((m) => (
                  <MetricRing
                    key={m.key}
                    label={m.label}
                    pct={m.pct}
                    icon={m.icon}
                    tone={m.tone}
                  />
                ))}
              </div>

              <div className="mt-6 border-t border-ink-100 pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Distribución
                </p>
                <div className="space-y-2">
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
          </div>

          <h2 className="section-title mb-4">Reseñas recientes</h2>
          <div className="space-y-3">
            {sortedReviews.map((r) => (
              <article key={r.id} className="card-hover p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-sm font-bold text-brand-600">
                      {(r.customer_name?.trim()?.[0] ?? "C").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {r.customer_name?.trim() || "Cliente"}
                      </p>
                      <StarRating value={r.rating} readonly size="sm" />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-ink-500">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-700">
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

function MetricRing({
  label,
  pct,
  icon: Icon,
  tone,
}: {
  label: string;
  pct: number;
  icon: typeof Smile;
  tone: "success" | "info" | "warn";
}) {
  const value = Math.max(0, Math.min(100, pct));
  const tones: Record<typeof tone, { chip: string; bar: string; text: string }> = {
    success: {
      chip: "bg-success-50 text-success-600",
      bar: "bg-success-500",
      text: "text-success-700",
    },
    info: {
      chip: "bg-info-50 text-info-600",
      bar: "bg-info-500",
      text: "text-info-700",
    },
    warn: {
      chip: "bg-warn-50 text-warn-700",
      bar: "bg-warn-500",
      text: "text-warn-700",
    },
  };
  const t = tones[tone];
  return (
    <div className="rounded-xl bg-surface-muted p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", t.chip)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className={cn("font-display text-lg font-bold", t.text)}>{value}%</span>
      </div>
      <p className="mb-2 text-xs font-medium text-ink-600">{label}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full transition-all", t.bar)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
