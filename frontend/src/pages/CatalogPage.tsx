import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Heart,
  AlertCircle,
  SlidersHorizontal,
  Truck,
  Wallet,
  ShieldCheck,
  Clock,
  Star,
  Flame,
} from "lucide-react";
import { listCategories, listProducts } from "@/services/products";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import { formatCurrency, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { CouponsBanner } from "@/components/CouponsBanner";
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

  function clearFilters() {
    setSearch("");
    setActiveCategory(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* ===== HERO ===== */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-pop sm:p-10">
        {/* decoraciones suaves */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-brand-300/20 blur-2xl" />

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
            <Flame className="h-3.5 w-3.5" />
            Recién salido de la freidora
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            🍗 Pollo crocante a tu puerta
          </h1>
          <p className="mt-3 text-brand-50">
            Pide en minutos y recíbelo calientito. Paga con Yape o efectivo, gana
            puntos y sube de nivel con cada pedido.
          </p>

          {/* chips de propuesta de valor dentro del hero */}
          <div className="mt-6 flex flex-wrap gap-2">
            <HeroPill icon={<Clock className="h-3.5 w-3.5" />} label="Entrega en ~30 min" />
            <HeroPill icon={<Wallet className="h-3.5 w-3.5" />} label="Yape o efectivo" />
            <HeroPill icon={<Truck className="h-3.5 w-3.5" />} label="Seguimiento en vivo" />
          </div>
        </div>
      </section>

      {/* ===== NOTIFICACIÓN DE CUPONES ===== */}
      <CouponsBanner />

      {/* ===== POR QUÉ ELEGIRNOS ===== */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BenefitCard
          icon={<Truck className="h-5 w-5" />}
          title="Entrega rápida"
          desc="Calientito en ~30 min"
        />
        <BenefitCard
          icon={<Wallet className="h-5 w-5" />}
          title="Pago flexible"
          desc="Yape, tarjeta o efectivo"
        />
        <BenefitCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Calidad garantizada"
          desc="Ingredientes frescos"
        />
        <BenefitCard
          icon={<Star className="h-5 w-5" />}
          title="Gana puntos"
          desc="Sube de nivel y ahorra"
        />
      </div>

      {/* ===== BÚSQUEDA ===== */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input-base pl-10"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="hidden items-center gap-2 text-xs font-medium text-ink-500 sm:flex">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtra por categoría
        </p>
      </div>

      {/* ===== CHIPS DE CATEGORÍA ===== */}
      <div className="mb-8 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ===== DESTACADOS ===== */}
      {featured.length > 0 && !search && activeCategory === null && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">⭐ Destacados</h2>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-500">
              <Flame className="h-3.5 w-3.5 text-brand-500" />
              Los más pedidos
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => add(p)} featured />
            ))}
          </div>
        </section>
      )}

      {/* ===== MENÚ ===== */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Menú</h2>
          {!loading && products.length > 0 && (
            <span className="text-xs font-medium text-ink-500">
              {products.length} {products.length === 1 ? "producto" : "productos"}
            </span>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
            <div className="text-5xl">🍗</div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
              No se encontraron productos
            </h3>
            <p className="mt-1 text-sm text-ink-500">Prueba con otra categoría o término.</p>
            <button onClick={clearFilters} className="btn-secondary mt-5">
              Limpiar filtros
            </button>
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

function HeroPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
      {icon}
      {label}
    </span>
  );
}

function BenefitCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink-900">{title}</p>
        <p className="truncate text-xs text-ink-500">{desc}</p>
      </div>
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
        "chip",
        active && "border-brand-500 bg-brand-500 text-white hover:border-brand-500 hover:bg-brand-500",
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-40 w-full" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="mt-3 flex items-center justify-between">
          <div className="skeleton h-5 w-16 rounded" />
          <div className="skeleton h-7 w-20 rounded-lg" />
        </div>
      </div>
    </div>
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
    <div className={cn("card-hover group flex flex-col overflow-hidden", featured && "ring-1 ring-brand-200")}>
      <Link to={`/products/${product.id}`} className="relative block overflow-hidden">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-6xl">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="transition-transform duration-300 group-hover:scale-110">
              {product.icon}
            </span>
          )}
        </div>
        {/* overlay sutil al hover para dar profundidad */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {featured && (
          <span className="badge badge-warn absolute left-2 top-2 shadow-card">
            <Star className="h-3 w-3 fill-warn-500 text-warn-500" />
            Destacado
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleFav(product);
          }}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-card transition hover:bg-white active:scale-95"
          aria-label={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition",
              isFav ? "fill-danger-500 text-danger-500" : "text-ink-400",
            )}
          />
        </button>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/products/${product.id}`}>
          <h3 className="text-base font-semibold leading-tight text-ink-900 transition group-hover:text-brand-600">
            {product.name}
          </h3>
        </Link>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-500">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-lg font-bold text-brand-600">
            {formatCurrency(product.price)}
          </span>
          <button onClick={onAdd} className="btn-primary !py-1.5 !text-xs">
            <Plus className="h-3.5 w-3.5" />
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
