import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Loader2,
  MapPin,
  Plus,
  StickyNote,
  Ticket,
  X,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { createOrder, calculateDeliveryFee, type DeliveryFeePreview } from "@/services/orders";
import { getProduct } from "@/services/products";
import { listAddresses, type Address } from "@/services/addresses";
import { applyCoupon } from "@/services/coupons";
import { formatCurrency, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { PaymentMethod } from "@/types/api";
import { LocationPicker, type Location } from "@/components/LocationPicker";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const FALLBACK_DELIVERY_FEE = 5;
const TAX_RATE = 0.18;

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "efectivo", label: "Efectivo", icon: "💵" },
  { value: "yape", label: "Yape", icon: "📱" },
  { value: "tarjeta", label: "Tarjeta", icon: "💳" },
];

interface AppliedCoupon {
  code: string;
  discount: number;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clear = useCartStore((s) => s.clear);
  const remove = useCartStore((s) => s.remove);
  const replaceProducts = useCartStore((s) => s.replaceProducts);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "new">("new");
  const [location, setLocation] = useState<Location | null>(null);
  const [addressDetail, setAddressDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [couponCode, setCouponCode] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [feePreview, setFeePreview] = useState<DeliveryFeePreview | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [priceChangeWarning, setPriceChangeWarning] = useState<string | null>(null);
  const [removedWarning, setRemovedWarning] = useState<string | null>(null);

  // Refresca los precios desde el backend al montar. Sin esto, el cliente vería
  // el precio cacheado en localStorage (Zustand persist) mientras el backend
  // cobra el precio actual — discrepancia entre lo mostrado y lo facturado.
  // Además purga del carrito los productos borrados o no disponibles para que
  // el pedido no falle entero al confirmar (NotFound / no disponible).
  useEffect(() => {
    if (items.length === 0) return;
    const snapshot = items.map((i) => ({ id: i.product.id, name: i.product.name }));
    let cancelled = false;
    Promise.all(snapshot.map((s) => getProduct(s.id).catch(() => null)))
      .then((fresh) => {
        if (cancelled) return;
        const freshById = new Map(
          fresh
            .filter((p): p is NonNullable<typeof p> => p != null)
            .map((p) => [p.id, p]),
        );

        // Items cuyo producto fue borrado (null) o pasó a is_available=false:
        // se eliminan del carrito y se avisa, en vez de dejarlos romper el pedido.
        const removed = snapshot.filter((s) => {
          const p = freshById.get(s.id);
          return !p || p.is_available === false;
        });
        if (removed.length > 0) {
          removed.forEach((s) => remove(s.id));
          const names = removed.map((s) => s.name).join(", ");
          setRemovedWarning(
            `Quitamos de tu pedido ${names} porque ya no está disponible.`,
          );
        }

        // Productos válidos y disponibles: refresca su snapshot (precio, etc.).
        const valid = Array.from(freshById.values()).filter(
          (p) => p.is_available !== false,
        );
        if (valid.length === 0) return;

        const changed = valid.filter((p) => {
          const local = snapshot.find((s) => s.id === p.id);
          const localItem = items.find((i) => i.product.id === p.id);
          return local && localItem && Math.abs(localItem.product.price - p.price) > 0.005;
        });
        replaceProducts(valid);
        if (changed.length > 0) {
          const names = changed.map((p) => p.name).join(", ");
          setPriceChangeWarning(
            `Los precios de ${names} se actualizaron. Revisa tu pedido antes de confirmar.`,
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Solo al montar: evita un loop infinito (replaceProducts cambia `items`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalcula el delivery cada vez que cambia la ubicación de entrega
  useEffect(() => {
    let lat: number | undefined;
    let lon: number | undefined;
    if (selectedAddressId === "new") {
      if (!location) {
        setFeePreview(null);
        return;
      }
      lat = location.lat;
      lon = location.lon;
    } else {
      const a = addresses.find((x) => x.id === selectedAddressId);
      if (a?.latitude && a?.longitude) {
        lat = a.latitude;
        lon = a.longitude;
      } else {
        setFeePreview(null);
        return;
      }
    }
    setFeeLoading(true);
    calculateDeliveryFee({ latitude: lat, longitude: lon })
      .then(setFeePreview)
      .catch(() => setFeePreview(null))
      .finally(() => setFeeLoading(false));
  }, [selectedAddressId, location?.lat, location?.lon, addresses]);

  const DELIVERY_FEE = feePreview?.fee ?? FALLBACK_DELIVERY_FEE;

  useEffect(() => {
    listAddresses()
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.is_default) ?? list[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => {
        // sin direcciones guardadas, sigue con mapa nuevo
      });
  }, []);

  // Revalida el cupón cuando cambia el subtotal (p.ej. tras refrescar precios o
  // editar el carrito). El descuento NO se cachea fijo: se deriva siempre del
  // subtotal actual contra el backend (que revalida min_order_amount y recalcula
  // el porcentaje), evitando que el total mostrado discrepe del recalculado.
  useEffect(() => {
    const code = applied?.code;
    if (!code) return;
    if (subtotal <= 0) return;
    let cancelled = false;
    applyCoupon(code, subtotal)
      .then((res) => {
        if (cancelled) return;
        if (res.valid) {
          setApplied((prev) =>
            prev && prev.code === code ? { ...prev, discount: res.discount } : prev,
          );
        } else {
          // El cupón dejó de ser válido para el nuevo subtotal: lo retiramos.
          setApplied(null);
          setCouponError(res.message);
        }
      })
      .catch(() => {
        // Error de red al revalidar: no rompemos el checkout.
      });
    return () => {
      cancelled = true;
    };
  }, [subtotal, applied?.code]);

  const tax = subtotal * TAX_RATE;
  const total = Math.max(0, subtotal + DELIVERY_FEE + tax - (applied?.discount ?? 0));

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const code = couponCode.trim().toUpperCase();
      const res = await applyCoupon(code, subtotal);
      if (res.valid) {
        setApplied({ code, discount: res.discount });
      } else {
        setCouponError(res.message);
        setApplied(null);
      }
    } catch (e) {
      setCouponError(getErrorMessage(e));
    } finally {
      setApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    setApplied(null);
    setCouponCode("");
    setCouponError(null);
  }

  function resolveDeliveryAddress(): string | null {
    if (selectedAddressId !== "new") {
      const a = addresses.find((x) => x.id === selectedAddressId);
      if (!a) return null;
      const parts = [
        a.label && `[${a.label}]`,
        a.full_address,
        a.reference,
        a.latitude && a.longitude && `(${a.latitude.toFixed(6)}, ${a.longitude.toFixed(6)})`,
      ].filter(Boolean);
      return parts.join(" — ");
    }
    if (!location) return null;
    return [
      location.address,
      addressDetail.trim(),
      `(${location.lat.toFixed(6)}, ${location.lon.toFixed(6)})`,
    ].filter(Boolean).join(" — ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    const fullAddress = resolveDeliveryAddress();
    if (!fullAddress) {
      setError("Selecciona una dirección o ubica tu entrega en el mapa");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const order = await createOrder({
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        delivery_address: fullAddress,
        payment_method: payment,
        notes: notes.trim() || undefined,
        coupon_code: applied?.code,
      });
      clear();
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="text-5xl">🍗</div>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
            No tienes productos en el carrito
          </h1>
          <p className="mt-2 max-w-sm text-sm text-ink-500">
            Explora el menú y arma tu pedido para continuar al pago.
          </p>
          <Link to="/" className="btn-primary mt-6">
            Ir al menú
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
        Finalizar pedido
      </h1>

      {removedWarning && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {removedWarning}
        </div>
      )}

      {priceChangeWarning && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {priceChangeWarning}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="section-title flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-500" />
                Dirección de entrega
              </h2>
              <Link
                to="/addresses"
                className="text-sm font-semibold text-brand-600 transition hover:underline"
              >
                Gestionar
              </Link>
            </div>

            {addresses.length > 0 && (
              <div className="mb-4 space-y-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition",
                      selectedAddressId === a.id
                        ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                        : "border-ink-200 hover:border-ink-300 hover:bg-ink-50",
                    )}
                  >
                    <input
                      type="radio"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="mt-1 accent-brand-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                        {a.label}
                        {a.is_default && (
                          <span className="badge badge-info">Predet.</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-ink-600">{a.full_address}</p>
                      {a.reference && (
                        <p className="mt-0.5 text-xs text-ink-500">{a.reference}</p>
                      )}
                    </div>
                  </label>
                ))}
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm font-medium transition",
                    selectedAddressId === "new"
                      ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                      : "border-ink-300 text-ink-700 hover:border-ink-400 hover:bg-ink-50",
                  )}
                >
                  <input
                    type="radio"
                    checked={selectedAddressId === "new"}
                    onChange={() => setSelectedAddressId("new")}
                    className="accent-brand-500"
                  />
                  <Plus className="h-4 w-4" />
                  Usar una ubicación nueva (mapa)
                </label>
              </div>
            )}

            {selectedAddressId === "new" && (
              <>
                <ErrorBoundary>
                  <LocationPicker value={location} onChange={setLocation} />
                </ErrorBoundary>
                <div className="mt-4">
                  <label className="label">
                    Referencia / detalle{" "}
                    <span className="font-normal text-ink-400">(opcional)</span>
                  </label>
                  <input
                    className="input-base"
                    placeholder="Dpto 4B, frente al parque, tocar timbre"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                  />
                </div>
              </>
            )}
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-brand-500" />
              Método de pago
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-4 transition",
                    payment === opt.value
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                      : "border-ink-200 hover:border-ink-300 hover:bg-ink-50",
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={opt.value}
                    checked={payment === opt.value}
                    onChange={() => setPayment(opt.value)}
                    className="sr-only"
                  />
                  <span className="text-2xl">{opt.icon}</span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      payment === opt.value ? "text-brand-700" : "text-ink-700",
                    )}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-brand-500" />
              Notas{" "}
              <span className="text-sm font-normal text-ink-400">(opcional)</span>
            </h2>
            <textarea
              rows={2}
              className="input-base resize-none"
              placeholder="Sin cebolla, dejar en recepción, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <aside className="card sticky top-20 h-fit p-6">
          <h2 className="section-title mb-4">Tu pedido</h2>
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.product.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-ink-700">
                  <span className="font-semibold text-ink-900">{item.quantity}×</span>{" "}
                  {item.product.name}
                </span>
                <span className="shrink-0 font-medium text-ink-900">
                  {formatCurrency(item.product.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-ink-200" />

          {/* Cupón */}
          <div className="mb-4">
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <Ticket className="h-3.5 w-3.5" /> Cupón
            </label>
            {applied ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                  <div>
                    <div className="font-mono font-semibold text-success-700">
                      {applied.code}
                    </div>
                    <div className="text-xs text-success-600">
                      -{formatCurrency(applied.discount)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="rounded-lg p-1 text-ink-400 transition hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300"
                  aria-label="Quitar cupón"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input-base uppercase"
                  placeholder="CÓDIGO"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode || applyingCoupon}
                  className="btn-ghost shrink-0"
                >
                  {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </button>
              </div>
            )}
            {couponError && <p className="mt-1.5 text-xs text-danger-600">{couponError}</p>}
          </div>

          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            <Row
              label={
                <span className="inline-flex items-center gap-1">
                  Delivery
                  {feeLoading && <Loader2 className="h-3 w-3 animate-spin text-ink-400" />}
                </span>
              }
              value={formatCurrency(DELIVERY_FEE)}
            />
            {feePreview?.distance_km != null && (
              <p className="pl-1 text-xs text-ink-500">
                📏 {feePreview.distance_km} km desde {feePreview.restaurant.name}
                {Math.abs(feePreview.fee - feePreview.min) < 0.01 &&
                  feePreview.raw_fee !== undefined &&
                  feePreview.raw_fee < feePreview.min && (
                    <span className="text-success-600"> · tarifa mínima</span>
                  )}
                {Math.abs(feePreview.fee - feePreview.max) < 0.01 &&
                  feePreview.raw_fee !== undefined &&
                  feePreview.raw_fee > feePreview.max && (
                    <span className="text-warn-600"> · tope máximo</span>
                  )}
              </p>
            )}
            <Row label="IGV (18%)" value={formatCurrency(tax)} />
            {applied && (
              <Row
                label={`Descuento (${applied.code})`}
                value={`-${formatCurrency(applied.discount)}`}
                discount
              />
            )}
            <div className="my-3 border-t border-ink-200" />
            <Row label="Total" value={formatCurrency(total)} bold />
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Procesando..." : "Confirmar pedido"}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  discount,
}: {
  label: React.ReactNode;
  value: string;
  bold?: boolean;
  discount?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        bold && "text-base font-bold text-ink-900",
        discount && "text-success-700",
      )}
    >
      <span className={bold ? "" : "text-ink-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
