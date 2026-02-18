"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

export default function CartButtonClientOnly() {
  const { items } = useCart();

  const count =
    items?.reduce((acc: number, it: any) => acc + (Number(it.qty) || 0), 0) ?? 0;

  return (
    <Link
      href="/cart"
      aria-label={`Корзина: ${count}`}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/70 backdrop-blur transition hover:bg-black/[0.04]"
    >
      <ShoppingBag className="h-[18px] w-[18px] text-black/75" />

      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
