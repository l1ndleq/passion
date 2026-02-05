"use client";

import Link from "next/link";
import { useCart } from "../app/cart-context";


export default function CartButton() {
  const { items } = useCart();
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
<Link
  href="/cart"
  className="relative inline-flex items-center justify-center gap-2
             rounded-full bg-neutral-900 px-6 py-3
             text-sm font-semibold tracking-wide text-white
             transition hover:bg-neutral-800 active:scale-[0.98]"
>
  <span className="text-base">🧴</span>
  <span>Корзина</span>

  {count > 0 && (
    <span
      className="absolute -right-1.5 -top-1.5
                 min-w-[22px] h-[22px]
                 rounded-full bg-black text-white
                 text-xs font-bold
                 flex items-center justify-center
                 tabular-nums
                 shadow"
    >
      {count}
    </span>
  )}
</Link>

  );
}
