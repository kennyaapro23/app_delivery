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
          // `items` es la única fuente de verdad; `ids` se deriva siempre de
          // `items` para que no puedan desincronizarse (corazón marcado sin
          // tarjeta, o tarjeta sin posibilidad de quitar).
          const exists = state.items.some((p) => p.id === product.id);
          const items = exists
            ? state.items.filter((p) => p.id !== product.id)
            : [...state.items, product];
          return { items, ids: items.map((p) => p.id) };
        }),
      isFavorite: (productId) => get().items.some((p) => p.id === productId),
      clear: () => set({ ids: [], items: [] }),
    }),
    {
      name: "chikenhot-favorites",
      // Reconcilia JSON persistido por versiones previas que pudieran haber
      // quedado con `ids`/`items` desincronizados: `ids` se re-deriva de `items`.
      onRehydrateStorage: () => (state) => {
        if (state) state.ids = state.items.map((p) => p.id);
      },
    },
  ),
);
