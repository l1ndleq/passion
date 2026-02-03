"use client";

import { useCart } from "@/app/cart-context";

export function AddToCartButton({
  product,
}: {
  product: { id: string; title: string; price: number };
}) {
  const { add } = useCart();

  return (
    <button
      onClick={() => add(product)}
      className="px-4 py-2 rounded-full bg-black text-white text-sm"
    >
      В корзину
    </button>
  );
}