import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Power, X, Package, Layers, Trash2 } from "lucide-react";
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
        setCategories(cs);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

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
      const payload = {
        name: productForm.name,
        description: productForm.description || undefined,
        price: parseFloat(productForm.price),
        category_id: parseInt(productForm.category_id, 10),
        icon: productForm.icon,
        image_url: productForm.image_url || undefined,
        is_featured: productForm.is_featured,
        is_available: productForm.is_available,
      };
      if (productForm.id) {
        await updateProduct(productForm.id, payload);
      } else {
        await createProduct(payload);
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
    const msg =
      productsInCat > 0
        ? `¿Desactivar "${c.name}"? Esto también desactivará ${productsInCat} producto(s).`
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1">
          <button
            onClick={() => setTab("products")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition",
              tab === "products" ? "bg-brand-500 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            <Package className="h-4 w-4" /> Productos ({products.length})
          </button>
          <button
            onClick={() => setTab("categories")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition",
              tab === "categories" ? "bg-brand-500 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            <Layers className="h-4 w-4" /> Categorías ({categories.length})
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : tab === "products" ? (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={openCreateProduct} className="btn-primary">
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {products.map((p) => (
                  <tr key={p.id} className={cn(!p.is_available && "opacity-60")}>
                    <td className="px-4 py-3 text-2xl">{p.icon}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      {p.is_featured && (
                        <span className="badge bg-yellow-100 text-yellow-800">⭐ Destacado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {categories.find((c) => c.id === p.category_id)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3">
                      {p.is_available ? (
                        <span className="badge bg-green-100 text-green-700">Activo</span>
                      ) : (
                        <span className="badge bg-neutral-200 text-neutral-700">Inactivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditProduct(p)}
                        className="rounded-lg p-2 hover:bg-neutral-100"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleProduct(p)}
                        className={cn(
                          "ml-1 rounded-lg p-2",
                          p.is_available
                            ? "text-red-600 hover:bg-red-50"
                            : "text-green-600 hover:bg-green-50",
                        )}
                        title={p.is_available ? "Desactivar" : "Activar"}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={openCreateCategory} className="btn-primary">
              <Plus className="h-4 w-4" /> Nueva categoría
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => {
              const count = products.filter((p) => p.category_id === c.id).length;
              return (
                <div key={c.id} className={cn("card p-5", !c.is_active && "opacity-60")}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{c.icon}</span>
                      <div>
                        <h3 className="font-bold">{c.name}</h3>
                        <p className="text-xs text-neutral-500">
                          {count} producto{count !== 1 && "s"} · Orden #{c.display_order}
                        </p>
                      </div>
                    </div>
                    {!c.is_active && (
                      <span className="badge bg-neutral-200 text-neutral-700">Inactiva</span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-3 text-sm text-neutral-600">{c.description}</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openEditCategory(c)}
                      className="btn-ghost flex-1 !text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c)}
                      className="btn-ghost !text-red-600 hover:!bg-red-50 !text-xs"
                      disabled={!c.is_active}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Producto */}
      {productForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <form onSubmit={saveProduct} className="my-8 w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {productForm.id ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button type="button" onClick={() => setProductForm(null)} className="rounded-lg p-2 hover:bg-neutral-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={productForm.is_featured}
                       onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })} />
                Destacado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={productForm.is_available}
                       onChange={(e) => setProductForm({ ...productForm, is_available: e.target.checked })} />
                Disponible (activo)
              </label>
            </div>

            <div className="flex justify-end gap-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <form onSubmit={saveCategory} className="my-8 w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {categoryForm.id ? "Editar categoría" : "Nueva categoría"}
              </h2>
              <button type="button" onClick={() => setCategoryForm(null)} className="rounded-lg p-2 hover:bg-neutral-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <Field label="Nombre">
              <input required className="input-base" value={categoryForm.name}
                     onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={categoryForm.is_active}
                     onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} />
              Activa
            </label>

            <div className="flex justify-end gap-2">
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

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      {children}
    </div>
  );
}
