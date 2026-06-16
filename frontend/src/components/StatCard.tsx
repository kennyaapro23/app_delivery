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
  const tones = {
    default: "bg-brand-50 text-brand-600",
    success: "bg-green-50 text-green-600",
    warning: "bg-yellow-50 text-yellow-700",
    danger: "bg-red-50 text-red-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
          {typeof trend === "number" && (
            <p
              className={cn(
                "mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                trend >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
              )}
            >
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs ayer
            </p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
