import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones: Record<NonNullable<typeof tone>, string> = {
    default: "bg-brand-50 text-brand-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warn-50 text-warn-700",
    danger: "bg-danger-50 text-danger-600",
  };

  const trendUp = typeof trend === "number" && trend >= 0;

  return (
    <div className="card p-5 transition hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
          {typeof trend === "number" && (
            <span
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                trendUp
                  ? "bg-success-100 text-success-700"
                  : "bg-danger-100 text-danger-700",
              )}
            >
              <span aria-hidden="true">{trendUp ? "▲" : "▼"}</span>
              {Math.abs(trend)}% vs ayer
            </span>
          )}
        </div>
        <div className={cn("shrink-0 rounded-xl p-2.5", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
