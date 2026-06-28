import { useEffect, useMemo, useState } from "react";
import { Ticket, Gift, Copy, Check, Clock, X, BadgePercent } from "lucide-react";
import { listCoupons, type Coupon } from "@/services/coupons";
import { formatCurrency, cn } from "@/lib/utils";

const DISMISS_KEY = "chikenhot.coupons.dismissed";

/** Lee del localStorage el set de ids de cupones que el cliente ya descartó. */
function readDismissed(): number[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "number") : [];
  } catch {
    return [];
  }
}

/** Persiste el set de ids descartados (silencioso ante errores de storage). */
function writeDismissed(ids: number[]) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(ids));
  } catch {
    /* almacenamiento no disponible: ignorar */
  }
}

/** Formatea el tiempo restante hasta `expiresAt`. Devuelve null si ya venció. */
function formatCountdown(expiresAt: string, now: number): string | null {
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - now;
  if (diff <= 0) return null;

  const minutes = Math.floor(diff / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function CouponsBanner() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [dismissed, setDismissed] = useState<number[]>(() => readDismissed());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  // Tick por minuto para refrescar las cuentas regresivas en vivo.
  const [now, setNow] = useState(() => Date.now());

  // Carga de cupones al montar. Error silencioso: si falla, no renderiza nada.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listCoupons();
        if (!cancelled) setCoupons(data);
      } catch {
        if (!cancelled) setCoupons([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Intervalo de 1 min para la cuenta regresiva; se limpia en el cleanup.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Reset del feedback de "copiado" tras un breve momento.
  useEffect(() => {
    if (copiedId === null) return;
    const id = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(id);
  }, [copiedId]);

  // Cupones visibles: no descartados y no expirados (recalculado con `now`).
  const visible = useMemo(() => {
    return coupons.filter((c) => {
      if (dismissed.includes(c.id)) return false;
      if (c.expires_at && formatCountdown(c.expires_at, now) === null) return false;
      return true;
    });
  }, [coupons, dismissed, now]);

  async function handleCopy(coupon: Coupon) {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopiedId(coupon.id);
    } catch {
      /* clipboard no disponible: feedback omitido silenciosamente */
    }
  }

  function handleDismiss(id: number) {
    const next = Array.from(new Set([...dismissed, id]));
    setDismissed(next);
    writeDismissed(next);
  }

  if (visible.length === 0) return null;

  return (
    <section
      aria-label="Cupones de descuento disponibles"
      className="mb-8 animate-slide-up overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-5 text-white shadow-pop sm:p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
          <Gift className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-tight sm:text-xl">
            {visible.length === 1
              ? "¡Tienes un cupón de descuento!"
              : `¡${visible.length} cupones de descuento te esperan!`}
          </h2>
          <p className="text-sm text-brand-50">
            Copia el código y úsalo al pagar tu pedido.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((coupon) => (
          <CouponCard
            key={coupon.id}
            coupon={coupon}
            copied={copiedId === coupon.id}
            countdown={coupon.expires_at ? formatCountdown(coupon.expires_at, now) : null}
            onCopy={() => handleCopy(coupon)}
            onDismiss={() => handleDismiss(coupon.id)}
          />
        ))}
      </div>
    </section>
  );
}

function CouponCard({
  coupon,
  copied,
  countdown,
  onCopy,
  onDismiss,
}: {
  coupon: Coupon;
  copied: boolean;
  countdown: string | null;
  onCopy: () => void;
  onDismiss: () => void;
}) {
  const discountLabel =
    coupon.discount_percent != null
      ? `${coupon.discount_percent}% OFF`
      : coupon.discount_amount != null
        ? `${formatCurrency(coupon.discount_amount)} OFF`
        : "Descuento";

  return (
    <div className="relative flex flex-col gap-3 rounded-xl bg-white/95 p-4 text-ink-900 shadow-card backdrop-blur">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Descartar cupón"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 active:scale-95"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 pr-7">
        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 font-display text-base font-bold text-brand-600">
          <BadgePercent className="h-4 w-4" />
          {discountLabel}
        </span>
      </div>

      {coupon.description && (
        <p className="line-clamp-2 text-sm text-ink-600">{coupon.description}</p>
      )}

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50/60 px-2.5 py-1.5 font-mono text-sm font-semibold tracking-wide text-brand-700">
          <Ticket className="h-4 w-4" />
          {coupon.code}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "btn-secondary !px-2.5 !py-1.5 !text-xs",
            copied && "bg-success-100 text-success-700 hover:bg-success-100",
          )}
          aria-label={copied ? "Código copiado" : "Copiar código"}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </>
          )}
        </button>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
        {coupon.min_order_amount > 0 && (
          <span>Pedido mínimo {formatCurrency(coupon.min_order_amount)}</span>
        )}
        {countdown && (
          <span className="inline-flex items-center gap-1 font-medium text-danger-600">
            <Clock className="h-3.5 w-3.5" />
            Vence en {countdown}
          </span>
        )}
      </div>
    </div>
  );
}
