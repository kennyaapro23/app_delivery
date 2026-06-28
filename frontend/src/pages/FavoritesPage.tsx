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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger-50">
            <Heart className="h-10 w-10 text-danger-300" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink-900">
            No tienes favoritos
          </h1>
          <p className="mt-2 max-w-sm text-sm text-ink-500">
            Marca productos con el corazón para guardarlos aquí y pedirlos más
            rápido la próxima vez.
          </p>
          <Link to="/" className="btn-primary mt-6">
            Ver el menú
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Mis favoritos
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {items.length} {items.length === 1 ? "producto guardado" : "productos guardados"}
          </p>
        </div>
        <span className="badge badge-danger">
          <Heart className="h-3.5 w-3.5 fill-current" />
          {items.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <div key={p.id} className="card-hover group flex flex-col overflow-hidden">
            <Link
              to={`/products/${p.id}`}
              className="relative block overflow-hidden"
            >
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-6xl">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="transition-transform duration-300 group-hover:scale-105">
                    {p.icon}
                  </span>
                )}
              </div>
              <span className="badge badge-danger absolute left-2 top-2 shadow-card">
                <Heart className="h-3 w-3 fill-current" /> Favorito
              </span>
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <Link to={`/products/${p.id}`}>
                <h3 className="text-base font-semibold leading-tight text-ink-900 transition group-hover:text-brand-600">
                  {p.name}
                </h3>
              </Link>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">
                  {p.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="font-display text-lg font-bold text-brand-600">
                  {formatCurrency(p.price)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => addToCart(p)}
                    className="btn-primary !py-1.5 !text-xs"
                    title="Añadir al carrito"
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir
                  </button>
                  <button
                    onClick={() => toggle(p)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-400 transition hover:border-danger-200 hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300"
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
