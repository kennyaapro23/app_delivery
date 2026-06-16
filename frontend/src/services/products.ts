import { api } from "@/lib/api";
import type { Category, Product, ProductListResponse } from "@/types/api";

export async function listCategories() {
  const { data } = await api.get<Category[]>("/products/categories");
  return data;
}

export async function listProducts(params?: {
  category_id?: number;
  search?: string;
  featured?: boolean;
  skip?: number;
  limit?: number;
}) {
  const { data } = await api.get<ProductListResponse>("/products", { params });
  return data;
}

export async function getProduct(id: number) {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}
