import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  courseId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  priceInCents: number;
  isFree: boolean;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (courseId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (get().items.some((i) => i.courseId === item.courseId)) return;
        set((state) => ({ items: [...state.items, item] }));
      },
      removeItem: (courseId) =>
        set((state) => ({ items: state.items.filter((i) => i.courseId !== courseId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "learnly-cart" },
  ),
);
