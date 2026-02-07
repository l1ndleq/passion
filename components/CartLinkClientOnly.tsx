"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/app/cart-context";

export default function CartLinkClientOnly() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { items } = useCart();

  const count = useMemo(() => {
    // подстрой под свою структуру items:
    // если у тебя quantity есть — суммируем, иначе просто длина массива
    const withQty = items?.some?.((x: any) => typeof x?.quantity === "number");
    if (withQty) return items.reduce((sum: number, x: any) => sum + (x.quantity || 0), 0);
    return items?.length ?? 0;
  }, [items]);

  // стиль как у остальных пунктов хедера (hover underline + цвет)
  const base =
    "group relative inline-flex items-center text-[10px] tracking-[0.22em] uppercase " +
    "text-black/55 hover:text-black transition-colors";

  const underline =
    "after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full after:origin-left " +
    "after:scale-x-0 after:bg-black after:transition-transform after:duration-300 " +
    "group-hover:after:scale-x-100";

  return (
    <Link href="/cart" className={`${base} ${underline}`}>
      Корзина
      {/* ВАЖНО: не показываем число до mounted, чтобы не было mismatch */}
      {mounted ? (
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/10 px-1.5 text-[10px] text-black/70">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
