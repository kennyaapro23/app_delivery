import { useEffect, useState } from "react";
import {
  Loader2, Plus, Pencil, Power, X, Package, Layers, Trash2,
  AlertCircle, Star,
} from "lucide-react";
import {
  createProduct,
  updateProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  listCategoriesAdmin,
  listProductsAdmin,
} from "@/services/admin-products";
import { formatCurrency, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { Product, Category } from "@/types/api";

type ProductForm = {
  id?: number;
  name: string;
  description: string;
  price: string;
  category_id: string;
  icon: string;
  image_url: string;
  is_featured: boolean;
  is_available: boolean;
};

const EMPTY_PRODUCT: ProductForm = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  icon: "🍗",
  image_url: "",
  is_featured: false,
  is_available: true,
};

type CategoryForm = {
  id?: number;
  name: string;
  description: string;
  icon: string;
  display_order: string;
  is_active: boolean;
};

const EMPTY_CATEGORY: CategoryForm = {
  name: "",
  description: "",
  icon: "🍗",
  display_order: "0",
  is_active: true,
};

export function AdminProductsPage() {
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Total real de productos en el backend (puede superar el límite cargado de 500).
  const [productsTotal, setProductsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([listProductsAdmin(), listCategoriesAdmin()])
      .then(([ps, cs]) => {
        setProducts(ps.products);
        setProductsTotal(ps.total);
        setCategories(cs);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // Si el catálogo excede el límite cargado, los conteos por categoría son aproximados.
  const countIncomplete = productsTotal > products.length;

  // ── PRODUCTOS ─────────────────────────────────────────────
  function openCreateProduct() {
    setProductForm({
      ...EMPTY_PRODUCT,
      category_id: String(categories.find((c) => c.is_active)?.id ?? ""),
    });
  }
  function openEditProduct(p: Product) {
    setProductForm({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      category_id: String(p.category_id),
      icon: p.icon,
      image_url: p.image_url ?? "",
      is_featured: p.is_featured,
      is_available: p.is_available,
    });
  }
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productForm) return;
    setSaving(true);
    setError(null);
    try {
      if (productForm.id) {
        await updateProduct(productForm.id, {
          name: productForm.name,
          description: productForm.description || undefined,
          price: parseFloat(productForm.price),
          category_id: parseInt(productForm.category_id, 10),
          icon: productForm.icon,
          image_url: productForm.image_url || undefined,
          is_featured: productForm.is_featured,
          is_available: productForm.is_available,
        });
      } else {
        // El tipo de createProduct no declara is_available, pero el backend lo
        // honra al crear. Lo adjuntamos a la carga (sin excess-property check)
        // para respetar la intención del admin cuando crea un producto inactivo.
        const createPayload: Parameters<typeof createProduct>[0] & { is_available?: boolean } = {
          name: productForm.name,
          description: productForm.description || undefined,
          price: parseFloat(productForm.price),
          category_id: parseInt(productForm.category_id, 10),
          icon: productForm.icon,
          image_url: productForm.image_url || undefined,
          is_featured: productForm.is_featured,
        };
        createPayload.is_available = productForm.is_available;
        await createProduct(createPayload);
      }
      setProductForm(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  async function toggleProduct(p: Product) {
    try {
      await updateProduct(p.id, { is_available: !p.is_available });
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  // ── CATEGORÍAS ────────────────────────────────────────────
  function openCreateCategory() {
    setCategoryForm({ ...EMPTY_CATEGORY, display_order: String(categories.length + 1) });
  }
  function openEditCategory(c: Category) {
    setCategoryForm({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      icon: c.icon,
      display_order: String(c.display_order),
      is_active: c.is_active,
    });
  }
  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryForm) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: categoryForm.name,
        description: categoryForm.description || undefined,
        icon: categoryForm.icon,
        display_order: parseInt(categoryForm.display_order, 10) || 0,
        is_active: categoryForm.is_active,
      };
      if (categoryForm.id) {
        await updateCategory(categoryForm.id, payload);
      } else {
        await createCategory(payload);
      }
      setCategoryForm(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  async function handleDeleteCategory(c: Category) {
    const productsInCat = products.filter((p) => p.category_id === c.id).length;
    // Si los datos cargados están incompletos, advertimos que el conteo es aproximado.
    const countText = countIncomplete ? `al menos ${productsInCat}` : `${productsInCat}`;
    const msg =
      productsInCat > 0
        ? `¿Desactivar "${c.name}"? Esto también desactivará ${countText} producto(s).`
        : `¿Desactivar "${c.name}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteCategory(c.id);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Catálogo
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Gestiona productos y categorías de tu menú.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1 shadow-card">
          <button
            onClick={() => setTab("products")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              tab === "products" ? "bg-brand-500 text-white shadow-card" : "text-ink-600 hover:bg-ink-50",
            )}
          >
            <Package className="h-4 w-4" /> Productos
            <span className={cn("rounded-full px-1.5 text-xs", tab === "products" ? "bg-white/20" : "bg-ink-100 text-ink-500")}>
              {products.length}
            </span>
          </button>
          <button
            onClick={() => setTab("categories")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              tab === "categories" ? "bg-brand-500 text-white shadow-card" : "text-ink-600 hover:bg-ink-50",
            )}
          >
            <Layers className="h-4 w-4" /> Categorías
            <span className={cn("rounded-full px-1.5 text-xs", tab === "categories" ? "bg-white/20" : "bg-ink-100 text-ink-500")}>
              {categories.length}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        tab === "products" ? (
          <div className="card overflow-hidden">
            <div className="divide-y divide-ink-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="skeleton h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/3 rounded" />
                    <div className="skeleton h-3 w-1/4 rounded" />
                  </div>
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-8 w-8 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>
                <div className="skeleton h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        )
      ) : tab === "products" ? (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={openCreateProduct} className="btn-primary">
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          </div>
          {products.length === 0 ? (
            <EmptyState
              icon="🍗"
              title="Aún no hay productos"
              subtitle="Crea tu primer producto para empezar a vender."
              action={
                <button onClick={openCreateProduct} className="btn-secondary mt-5">
                  <Plus className="h-4 w-4" /> Nuevo producto
                </button>
              }
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                      <th className="px-4 py-3"></th>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {products.map((p) => (
                      <tr
                        key={p.id}
                        className={cn("transition hover:bg-ink-50", !p.is_available && "opacity-60")}
                      >
                        <td className="px-4 py-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-xl">
                            {p.icon}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink-900">{p.name}</div>
                          {p.is_featured && (
                            <span className="badge badge-warn mt-1">
                              <Star className="h-3 w-3 fill-warn-500 text-warn-500" /> Destacado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-500">
                          {categories.find((c) => c.id === p.category_id)?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-display font-bold text-brand-600">
                            {formatCurrency(p.price)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.is_available ? (
                            <span className="badge badge-success">Activo</span>
                          ) : (
                            <span className="badge bg-ink-100 text-ink-600">Inactivo</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditProduct(p)}
                              className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleProduct(p)}
                              className={cn(
                                "rounded-lg p-2 transition focus-visible:outline-none focus-visible:ring-2",
                                p.is_available
                                  ? "text-danger-600 hover:bg-danger-50 focus-visible:ring-danger-300"
                                  : "text-success-600 hover:bg-success-50 focus-visible:ring-success-300",
                              )}
                              title={p.is_available ? "Desactivar" : "Activar"}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={openCreateCategory} className="btn-primary">
              <Plus className="h-4 w-4" /> Nueva categoría
            </button>
          </div>
          {categories.length === 0 ? (
            <EmptyState
              icon="📂"
              title="Aún no hay categorías"
              subtitle="Organiza tu menú creando categorías."
              action={
                <button onClick={openCreateCategory} className="btn-secondary mt-5">
                  <Plus className="h-4 w-4" /> Nueva categoría
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => {
                const count = products.filter((p) => p.category_id === c.id).length;
                return (
                  <div
                    key={c.id}
                    className={cn("card-hover p-5", !c.is_active && "opacity-60")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-2xl">
                          {c.icon}
                        </span>
                        <div>
                          <h3 className="text-base font-semibold leading-tight text-ink-900">{c.name}</h3>
                          <p className="mt-0.5 text-xs text-ink-500">
                            {countIncomplete && count > 0 ? "≥ " : ""}
                            {count} producto{count !== 1 && "s"} · Orden #{c.display_order}
                          </p>
                        </div>
                      </div>
                      {!c.is_active && (
                        <span className="badge bg-ink-100 text-ink-600">Inactiva</span>
                      )}
                    </div>
                    {c.description && (
                      <p className="mt-3 text-sm leading-relaxed text-ink-600">{c.description}</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openEditCategory(c)}
                        className="btn-ghost flex-1 !py-1.5 !text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c)}
                        className="btn-ghost !px-2.5 !py-1.5 !text-danger-600 hover:!border-danger-200 hover:!bg-danger-50"
                        disabled={!c.is_active}
                        title="Desactivar categoría"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Producto */}
      {productForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={saveProduct}
            className="my-8 w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-pop"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">
                {productForm.id ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button
                type="button"
                onClick={() => setProductForm(null)}
                className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre" colSpan>
                <input required className="input-base" value={productForm.name}
                       onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              </Field>
              <Field label="Precio (S/)">
                <input type="number" step="0.01" min="0" required className="input-base" value={productForm.price}
                       onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
              </Field>
              <Field label="Icono (emoji)">
                <input className="input-base" value={productForm.icon}
                       onChange={(e) => setProductForm({ ...productForm, icon: e.target.value })} />
              </Field>
              <Field label="Categoría" colSpan>
                <select required className="input-base" value={productForm.category_id}
                        onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {categories.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Descripción" colSpan>
                <textarea rows={2} className="input-base resize-none" value={productForm.description}
                          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              </Field>
              <Field label="URL de imagen (opcional)" colSpan>
                <input className="input-base" value={productForm.image_url}
                       onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-300 hover:bg-ink-50">
                <input type="checkbox" className="accent-brand-500" checked={productForm.is_featured}
                       onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })} />
                Destacado
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-300 hover:bg-ink-50">
                <input type="checkbox" className="accent-brand-500" checked={productForm.is_available}
                       onChange={(e) => setProductForm({ ...productForm, is_available: e.target.checked })} />
                Disponible (activo)
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <button type="button" className="btn-ghost" onClick={() => setProductForm(null)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {productForm.id ? "Guardar" : "Crear producto"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Categoría */}
      {categoryForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={saveCategory}
            className="my-8 w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-pop"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">
                {categoryForm.id ? "Editar categoría" : "Nueva categoría"}
              </h2>
              <button
                type="button"
                onClick={() => setCategoryForm(null)}
                className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Field label="Nombre">
              <input required className="input-base" value={categoryForm.name}
                     onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Icono (emoji)">
                <input className="input-base" value={categoryForm.icon}
                       onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })} />
              </Field>
              <Field label="Orden de display">
                <input type="number" className="input-base" value={categoryForm.display_order}
                       onChange={(e) => setCategoryForm({ ...categoryForm, display_order: e.target.value })} />
              </Field>
            </div>
            <Field label="Descripción (opcional)">
              <textarea rows={2} className="input-base resize-none" value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
            </Field>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-300 hover:bg-ink-50">
              <input type="checkbox" className="accent-brand-500" checked={categoryForm.is_active}
                     onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} />
              Activa
            </label>

            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <button type="button" className="btn-ghost" onClick={() => setCategoryForm(null)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {categoryForm.id ? "Guardar" : "Crear categoría"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon, title, subtitle, action,
}: { icon: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
      <div className="text-5xl">{icon}</div>
      <h3 className="mt-4 font-display text-lg font-bold text-ink-800">{title}</h3>
      <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
      {action}
    </div>
  );
}

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
