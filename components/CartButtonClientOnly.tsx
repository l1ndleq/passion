"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

export default function CartButtonClientOnly() {
  const { items } = useCart();
  const count =
    items?.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0) ?? 0;

  return (
    <Link
      href="/cart"
      aria-label={`Корзина: ${count}`}
      className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-black/[0.04]"
    >
      <ShoppingBag className="h-5 w-5 text-black/75" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
