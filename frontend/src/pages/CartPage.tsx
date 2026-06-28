import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, Info, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { formatCurrency } from "@/lib/utils";

export function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore((s) => s.subtotal());
  const token = useAuthStore((s) => s.accessToken);

  function goToCheckout() {
    if (!token) {
      navigate("/login", { state: { from: "/checkout" } });
    } else {
      navigate("/checkout");
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <ShoppingBag className="h-9 w-9" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink-900">
            Tu carrito está vacío
          </h1>
          <p className="mt-2 max-w-sm text-sm text-ink-500">
            Añade productos del menú para empezar tu pedido y recíbelo calientito.
          </p>
          <Link to="/" className="btn-primary mt-6">
            Ver menú
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
          🛒 Tu carrito
        </h1>
        <span className="badge badge-info">
          {itemCount} {itemCount === 1 ? "producto" : "productos"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="card flex flex-col gap-4 p-4 transition hover:border-ink-300 hover:shadow-card-hover sm:flex-row sm:items-center"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-3xl">
                {item.product.icon}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold leading-tight text-ink-900">
                  {item.product.name}
                </h3>
                <p className="mt-1 text-xs text-ink-500">
                  {formatCurrency(item.product.price)} c/u
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="inline-flex items-center rounded-lg border border-ink-200 bg-white">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="rounded-l-lg px-2.5 py-2 text-ink-600 transition hover:bg-ink-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-ink-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="rounded-r-lg px-2.5 py-2 text-ink-600 transition hover:bg-ink-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="w-20 text-right font-display text-base font-bold text-brand-600">
                  {formatCurrency(item.product.price * item.quantity)}
                </div>

                <button
                  onClick={() => remove(item.product.id)}
                  className="rounded-lg p-2 text-ink-400 transition hover:bg-danger-50 hover:text-danger-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card sticky top-20 h-fit p-6">
          <h2 className="section-title mb-4">Resumen</h2>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatCurrency(subtotal)} bold />
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-info-200 bg-info-50 px-3 py-2 text-xs text-info-700">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            El delivery y el IGV se calculan en el checkout según la dirección de entrega.
          </p>
          <button onClick={goToCheckout} className="btn-primary mt-6 w-full">
            Continuar al pago
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link to="/" className="btn-ghost mt-2 w-full">
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? "text-base font-bold text-ink-900" : ""
      }`}
    >
      <span className={bold ? "" : "text-ink-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
