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

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover ?? value) >= n;
        const Icon = (
          <Star
            className={cn(
              sizes,
              filled ? "fill-yellow-400 text-yellow-400" : "text-neutral-300",
            )}
          />
        );
        if (readonly || !onChange) {
          return <span key={n}>{Icon}</span>;
        }
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            className="rounded p-0.5 hover:bg-neutral-100"
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          >
            {Icon}
          </button>
        );
      })}
    </div>
  );
}
