import { api } from "@/lib/api";
import type { Product, Category } from "@/types/api";

export async function createProduct(payload: {
  name: string;
  description?: string;
  price: number;
  category_id: number;
  icon?: string;
  image_url?: string;
  is_featured?: boolean;
}) {
  const { data } = await api.post<Product>("/products", payload);
  return data;
}

export async function updateProduct(
  id: number,
  payload: Partial<{
    name: string;
    description: string;
    price: number;
    category_id: number;
    icon: string;
    image_url: string;
    is_available: boolean;
    is_featured: boolean;
  }>,
) {
  const { data } = await api.put<Product>(`/products/${id}`, payload);
  return data;
}

export async function deactivateProduct(id: number) {
  const { data } = await api.delete<Product>(`/products/${id}`);
  return data;
}

export async function createCategory(payload: {
  name: string;
  description?: string;
  icon?: string;
  display_order?: number;
}) {
  const { data } = await api.post<Category>("/products/categories", payload);
  return data;
}

export async function updateCategory(
  id: number,
  payload: Partial<{
    name: string;
    description: string;
    icon: string;
    is_active: boolean;
    display_order: number;
  }>,
) {
  const { data } = await api.put<Category>(`/products/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id: number) {
  const { data } = await api.delete<Category>(`/products/categories/${id}`);
  return data;
}

export async function listCategoriesAdmin() {
  const { data } = await api.get<Category[]>("/products/categories", {
    params: { include_inactive: true },
  });
  return data;
}

export async function listProductsAdmin() {
  const { data } = await api.get<{ products: import("@/types/api").Product[]; total: number }>(
    "/products",
    { params: { include_inactive: true, limit: 500 } },
  );
  return data;
}
