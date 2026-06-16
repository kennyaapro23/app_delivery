import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MapPin, Plus, Ticket, X } from "lucide-react";
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

  // Refresca los precios desde el backend al montar. Sin esto, el cliente vería
  // el precio cacheado en localStorage (Zustand persist) mientras el backend
  // cobra el precio actual — discrepancia entre lo mostrado y lo facturado.
  useEffect(() => {
    if (items.length === 0) return;
    const productIds = items.map((i) => i.product.id);
    let cancelled = false;
    Promise.all(productIds.map((id) => getProduct(id).catch(() => null)))
      .then((fresh) => {
        if (cancelled) return;
        const valid = fresh.filter((p): p is NonNullable<typeof p> => p != null);
        if (valid.length === 0) return;
        const changed = valid.filter((p) => {
          const local = items.find((i) => i.product.id === p.id);
          return local && Math.abs(local.product.price - p.price) > 0.005;
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

  const tax = subtotal * TAX_RATE;
  const total = Math.max(0, subtotal + DELIVERY_FEE + tax - (applied?.discount ?? 0));

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await applyCoupon(couponCode.trim(), subtotal);
      if (res.valid) {
        setApplied({ code: couponCode.trim().toUpperCase(), discount: res.discount });
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
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">No tienes productos en el carrito</h1>
        <Link to="/" className="btn-primary mt-6 inline-flex">Ir al menú</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Finalizar pedido</h1>

      {priceChangeWarning && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ {priceChangeWarning}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">📍 Dirección de entrega</h2>
              <Link to="/addresses" className="text-xs text-brand-600 hover:underline">
                Gestionar direcciones
              </Link>
            </div>

            {addresses.length > 0 && (
              <div className="mb-4 space-y-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 text-sm transition",
                      selectedAddressId === a.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-neutral-200 hover:border-neutral-300",
                    )}
                  >
                    <input
                      type="radio"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-brand-500" />
                        {a.label}
                        {a.is_default && (
                          <span className="badge bg-brand-100 text-brand-700">Predet.</span>
                        )}
                      </div>
                      <p className="text-neutral-600">{a.full_address}</p>
                      {a.reference && <p className="text-xs text-neutral-500">{a.reference}</p>}
                    </div>
                  </label>
                ))}
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 text-sm transition",
                    selectedAddressId === "new"
                      ? "border-brand-500 bg-brand-50"
                      : "border-neutral-300 hover:border-neutral-400",
                  )}
                >
                  <input
                    type="radio"
                    checked={selectedAddressId === "new"}
                    onChange={() => setSelectedAddressId("new")}
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
                  <label className="mb-1 block text-sm font-medium">
                    Referencia / detalle <span className="text-neutral-400">(opcional)</span>
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
            <h2 className="mb-4 text-lg font-semibold">💳 Método de pago</h2>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-4 transition",
                    payment === opt.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-neutral-200 hover:border-neutral-300",
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
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">📝 Notas (opcional)</h2>
            <textarea
              rows={2}
              className="input-base resize-none"
              placeholder="Sin cebolla, dejar en recepción, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <aside className="card sticky top-20 h-fit p-6">
          <h2 className="mb-4 text-lg font-bold">Tu pedido</h2>
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.product.id} className="flex items-center justify-between">
                <span className="truncate">{item.quantity}× {item.product.name}</span>
                <span className="ml-2 shrink-0 font-medium">
                  {formatCurrency(item.product.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-neutral-200" />

          {/* Cupón */}
          <div className="mb-4">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-neutral-500">
              <Ticket className="h-3 w-3" /> Cupón
            </label>
            {applied ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                <div>
                  <div className="font-mono font-semibold text-green-700">{applied.code}</div>
                  <div className="text-xs text-green-600">-{formatCurrency(applied.discount)}</div>
                </div>
                <button type="button" onClick={removeCoupon} className="text-red-500 hover:text-red-700">
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
            {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
          </div>

          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            <Row
              label={
                <span className="inline-flex items-center gap-1">
                  Delivery
                  {feeLoading && <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />}
                </span>
              }
              value={formatCurrency(DELIVERY_FEE)}
            />
            {feePreview?.distance_km != null && (
              <p className="text-xs text-neutral-500 pl-1">
                📏 {feePreview.distance_km} km desde {feePreview.restaurant.name}
                {Math.abs(feePreview.fee - feePreview.min) < 0.01 && feePreview.raw_fee !== undefined && feePreview.raw_fee < feePreview.min && (
                  <span className="text-green-600"> · tarifa mínima</span>
                )}
                {Math.abs(feePreview.fee - feePreview.max) < 0.01 && feePreview.raw_fee !== undefined && feePreview.raw_fee > feePreview.max && (
                  <span className="text-orange-600"> · tope máximo</span>
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
            <div className="my-3 border-t border-neutral-200" />
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
        bold && "text-base font-bold",
        discount && "text-green-700",
      )}
    >
      <span className={bold ? "" : "text-neutral-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
