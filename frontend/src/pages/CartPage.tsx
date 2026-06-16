import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, Info } from "lucide-react";
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
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <ShoppingBag className="mx-auto h-16 w-16 text-neutral-300" />
        <h1 className="mt-4 text-2xl font-bold">Tu carrito está vacío</h1>
        <p className="mt-2 text-neutral-500">
          Añade productos del menú para empezar tu pedido
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Ver menú
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">🛒 Tu carrito</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <div key={item.product.id} className="card flex items-center gap-4 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-3xl">
                {item.product.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{item.product.name}</h3>
                <p className="text-sm text-neutral-500">
                  {formatCurrency(item.product.price)} c/u
                </p>
              </div>
              <div className="flex items-center rounded-lg border border-neutral-200">
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  className="px-2 py-1.5 hover:bg-neutral-50"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  className="px-2 py-1.5 hover:bg-neutral-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="w-20 text-right font-semibold">
                {formatCurrency(item.product.price * item.quantity)}
              </div>
              <button
                onClick={() => remove(item.product.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="card sticky top-20 h-fit p-6">
          <h2 className="mb-4 text-lg font-bold">Resumen</h2>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatCurrency(subtotal)} bold />
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
            El delivery y el IGV se calculan en el checkout según la dirección de entrega.
          </p>
          <button onClick={goToCheckout} className="btn-primary mt-6 w-full">
            Continuar al pago
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
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold" : ""}`}>
      <span className={bold ? "" : "text-neutral-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
