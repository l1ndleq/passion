"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/components/cart/CartProvider";

export default function CartButton() {
  const { items } = useCart();

  const count = useMemo(
    () => items.reduce((s, x) => s + (Number(x.qty) || 0), 0),
    [items]
  );

  return (
    <Link
      href="/cart"
      aria-label={`Корзина: ${count}`}
      className="relative inline-flex items-center justify-center gap-2 rounded-full
                 bg-neutral-900 px-5 py-2.5 text-sm font-semibold tracking-wide text-white
                 transition-[background-color,transform] duration-300
                 hover:bg-neutral-800 active:scale-[0.98]"
    >
      <span aria-hidden>🧴</span>
      <span>Корзина</span>

      <span
        className="ml-1 inline-flex min-w-6 items-center justify-center rounded-full
                   bg-white/15 px-2 py-0.5 text-[11px] font-semibold"
      >
        {count}
      </span>
    </Link>
  );
}
