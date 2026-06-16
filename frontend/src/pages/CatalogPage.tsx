import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Plus, Heart } from "lucide-react";
import { listCategories, listProducts } from "@/services/products";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import { formatCurrency, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { Category, Product } from "@/types/api";

export function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const add = useCartStore((s) => s.add);

  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories();
        setCategories(cats);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await listProducts({
          category_id: activeCategory ?? undefined,
          search: search.trim() || undefined,
          limit: 100,
        });
        if (!cancelled) setProducts(data.products);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, search]);

  const featured = useMemo(() => products.filter((p) => p.is_featured).slice(0, 3), [products]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-lg">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold sm:text-4xl">
            🍗 Pollo crocante a tu puerta
          </h1>
          <p className="mt-2 text-brand-50">
            Pide en minutos. Recíbelo calientito. Gana puntos y sube de nivel.
          </p>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-base pl-10"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        <CategoryChip
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          label="Todos"
          icon="✨"
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            active={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
            label={c.name}
            icon={c.icon}
          />
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {featured.length > 0 && !search && !activeCategory && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold">⭐ Destacados</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => add(p)} featured />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-bold">Menú</h2>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-500">
            No se encontraron productos
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => add(p)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function ProductCard({
  product,
  onAdd,
  featured,
}: {
  product: Product;
  onAdd: () => void;
  featured?: boolean;
}) {
  const isFav = useFavoritesStore((s) => s.isFavorite(product.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  return (
    <div className={cn("card overflow-hidden flex flex-col", featured && "ring-1 ring-brand-200")}>
      <Link to={`/products/${product.id}`} className="block relative">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-6xl">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span>{product.icon}</span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleFav(product);
          }}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
          aria-label={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition",
              isFav ? "fill-red-500 text-red-500" : "text-neutral-400",
            )}
          />
        </button>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/products/${product.id}`}>
          <h3 className="font-semibold leading-tight hover:text-brand-600">{product.name}</h3>
        </Link>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-bold text-brand-600">{formatCurrency(product.price)}</span>
          <button onClick={onAdd} className="btn-primary !py-1.5 !text-xs">
            <Plus className="h-3.5 w-3.5" />
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
