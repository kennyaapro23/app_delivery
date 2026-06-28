import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, AlertCircle, ShoppingCart } from "lucide-react";
import { getProduct } from "@/services/products";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { Product } from "@/types/api";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const add = useCartStore((s) => s.add);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProduct(Number(id))
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleAdd() {
    if (!product) return;
    add(product, quantity);
    navigate("/cart");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="skeleton mb-6 h-5 w-32 rounded" />
        <div className="card grid grid-cols-1 gap-8 p-6 md:grid-cols-2">
          <div className="skeleton h-72 w-full rounded-xl md:h-full" />
          <div className="flex flex-col gap-4">
            <div className="skeleton h-6 w-28 rounded-full" />
            <div className="skeleton h-9 w-3/4 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
            <div className="skeleton mt-4 h-10 w-40 rounded" />
            <div className="skeleton mt-4 h-11 w-36 rounded-lg" />
            <div className="skeleton mt-4 h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="text-5xl">🍗</div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
            {error ?? "Producto no encontrado"}
          </h3>
          <p className="mt-1 text-sm text-ink-500">No pudimos cargar este producto.</p>
          <Link to="/" className="btn-secondary mt-5">
            Volver al menú
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 rounded-lg px-1 text-sm font-medium text-ink-600 transition hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al menú
      </Link>

      <div className="card grid grid-cols-1 gap-8 p-6 md:grid-cols-2">
        <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-9xl md:h-full">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full rounded-xl object-cover"
            />
          ) : (
            <span>{product.icon}</span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {product.category && (
              <span className="badge badge-info w-fit">
                {product.category.icon} {product.category.name}
              </span>
            )}
            {product.is_featured && <span className="badge badge-warn w-fit">⭐ Destacado</span>}
            <span
              className={`badge w-fit ${product.is_available ? "badge-success" : "badge-danger"}`}
            >
              {product.is_available ? "Disponible" : "Agotado"}
            </span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            {product.name}
          </h1>
          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-ink-700">{product.description}</p>
          )}

          <div className="mt-6 font-display text-4xl font-bold text-brand-600">
            {formatCurrency(product.price)}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="label mb-0">Cantidad:</span>
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-ink-700 transition hover:bg-ink-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                aria-label="Reducir cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold text-ink-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 text-ink-700 transition hover:bg-ink-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!product.is_available && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Este producto no está disponible por ahora.
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={!product.is_available}
            className="btn-primary mt-8 w-full sm:w-auto"
          >
            <ShoppingCart className="h-4 w-4" />
            {product.is_available
              ? `Añadir al carrito · ${formatCurrency(product.price * quantity)}`
              : "No disponible"}
          </button>
        </div>
      </div>
    </div>
  );
}
