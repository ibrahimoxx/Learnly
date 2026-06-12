"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/lib/stores/cart-store";

interface AddToCartButtonProps {
  courseId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  priceInCents: number;
  isFree: boolean;
}

export function AddToCartButton({ courseId, slug, title, imageUrl, priceInCents, isFree }: AddToCartButtonProps) {
  const { items, addItem } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (isFree) return null;

  const inCart = mounted && items.some((item) => item.courseId === courseId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) return;
    addItem({ courseId, slug, title, imageUrl, priceInCents, isFree });
    toast.success("Added to cart");
  }

  return (
    <button
      onClick={handleClick}
      aria-label={inCart ? `${title} is in your cart` : `Add ${title} to cart`}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[--color-border] bg-[--color-surface-glass] text-[--color-text-secondary] shadow-[var(--shadow-xs)] backdrop-blur transition-colors hover:border-[--color-primary] hover:text-[--color-primary] disabled:opacity-60"
      disabled={inCart}
    >
      {inCart ? <Check className="h-4 w-4 text-[--color-success]" /> : <ShoppingCart className="h-4 w-4" />}
    </button>
  );
}
