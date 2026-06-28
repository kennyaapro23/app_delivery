import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = "md", readonly }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const sizes = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  const interactive = !readonly && !!onChange;

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover ?? value) >= n;
        const Icon = (
          <Star
            aria-hidden="true"
            className={cn(
              sizes,
              "transition-colors",
              filled ? "fill-warn-400 text-warn-400" : "text-ink-300",
            )}
          />
        );
        if (!interactive) {
          return <span key={n}>{Icon}</span>;
        }
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange?.(n)}
            className="rounded-lg p-0.5 transition hover:bg-ink-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          >
            {Icon}
          </button>
        );
      })}
    </div>
  );
}
