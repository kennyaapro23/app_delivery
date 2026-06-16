import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Minus, Plus } from "lucide-react";
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
    setLoading(true);
    getProduct(Number(id))
      .then(setProduct)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  function handleAdd() {
    if (!product) return;
    add(product, quantity);
    navigate("/cart");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-red-600">{error ?? "Producto no encontrado"}</p>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          Volver al menú
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" />
        Volver al menú
      </Link>

      <div className="card grid grid-cols-1 gap-8 p-6 md:grid-cols-2">
        <div className="flex h-72 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-9xl md:h-full">
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
          {product.category && (
            <span className="badge bg-brand-50 text-brand-700 w-fit">
              {product.category.icon} {product.category.name}
            </span>
          )}
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
          <p className="mt-4 text-neutral-600">{product.description}</p>

          <div className="mt-6 text-4xl font-bold text-brand-600">
            {formatCurrency(product.price)}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-medium">Cantidad:</span>
            <div className="flex items-center rounded-lg border border-neutral-200">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 hover:bg-neutral-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 hover:bg-neutral-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button onClick={handleAdd} disabled={!product.is_available} className="btn-primary mt-8">
            {product.is_available
              ? `Añadir al carrito · ${formatCurrency(product.price * quantity)}`
              : "No disponible"}
          </button>
        </div>
      </div>
    </div>
  );
}
