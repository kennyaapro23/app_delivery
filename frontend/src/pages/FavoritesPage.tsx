import { Link } from "react-router-dom";
import { Heart, Plus, Trash2 } from "lucide-react";
import { useFavoritesStore } from "@/store/favorites";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";

export function FavoritesPage() {
  const items = useFavoritesStore((s) => s.items);
  const toggle = useFavoritesStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.add);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Heart className="mx-auto h-16 w-16 text-neutral-300" />
        <h1 className="mt-4 text-2xl font-bold">No tienes favoritos</h1>
        <p className="mt-2 text-neutral-500">
          Marca productos con ❤️ para guardarlos aquí
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Ver menú</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">❤️ Mis favoritos ({items.length})</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <Link to={`/products/${p.id}`} className="block">
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-6xl">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  p.icon
                )}
              </div>
            </Link>
            <div className="p-4">
              <Link to={`/products/${p.id}`}>
                <h3 className="font-semibold hover:text-brand-600">{p.name}</h3>
              </Link>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{p.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-bold text-brand-600">{formatCurrency(p.price)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => addToCart(p)}
                    className="btn-primary !py-1.5 !text-xs"
                    title="Añadir al carrito"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggle(p)}
                    className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                    title="Quitar de favoritos"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
