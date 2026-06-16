import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/api";

interface FavoritesState {
  ids: number[];
  items: Product[];
  toggle: (product: Product) => void;
  isFavorite: (productId: number) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      items: [],
      toggle: (product) =>
        set((state) => {
          const exists = state.ids.includes(product.id);
          if (exists) {
            return {
              ids: state.ids.filter((id) => id !== product.id),
              items: state.items.filter((p) => p.id !== product.id),
            };
          }
          return {
            ids: [...state.ids, product.id],
            items: [...state.items, product],
          };
        }),
      isFavorite: (productId) => get().ids.includes(productId),
      clear: () => set({ ids: [], items: [] }),
    }),
    { name: "chikenhot-favorites" },
  ),
);
