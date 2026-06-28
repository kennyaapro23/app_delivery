import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, CartItem } from "@/types/api";

interface CartState {
  items: CartItem[];
  add: (product: Product, quantity?: number) => void;
  remove: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  /**
   * Sustituye el snapshot del producto (precio, stock, disponibilidad, etc.)
   * sin tocar la cantidad. Útil para refrescar precios al entrar al checkout
   * y evitar la discrepancia "frontend muestra precio viejo, backend cobra el nuevo".
   */
  replaceProducts: (fresh: Product[]) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product, quantity = 1) =>
        set((state) => {
          // Sanea la cantidad: evita NaN (input sin parsear), negativos o cero,
          // que corromperían el ítem y se enviarían a createOrder.
          const q = Math.max(1, Math.floor(Number(quantity) || 1));
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + q }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { product, quantity: q }] };
        }),
      remove: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.product.id !== productId)
              : state.items.map((i) =>
                  i.product.id === productId ? { ...i, quantity } : i,
                ),
        })),
      replaceProducts: (fresh) =>
        set((state) => {
          const byId = new Map(fresh.map((p) => [p.id, p]));
          return {
            // Además de refrescar el snapshot del producto, elimina los ítems
            // cuyo producto refrescado quedó no disponible (is_available=false):
            // de lo contrario el usuario los vería y pagaría, pero el backend
            // rechazaría la orden o cobraría un total distinto.
            items: state.items
              .filter((i) => {
                const updated = byId.get(i.product.id);
                return !updated || updated.is_available;
              })
              .map((i) => {
                const updated = byId.get(i.product.id);
                return updated ? { ...i, product: updated } : i;
              }),
          };
        }),
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce(
          (acc, i) => (i.product.is_available ? acc + i.product.price * i.quantity : acc),
          0,
        ),
      count: () =>
        get().items.reduce(
          (acc, i) => (i.product.is_available ? acc + i.quantity : acc),
          0,
        ),
    }),
    { name: "chikenhot-cart" },
  ),
);
