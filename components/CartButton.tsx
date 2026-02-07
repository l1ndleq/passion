"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/app/cart-context";

export default function CartButton() {
  const { items } = useCart() as any; // если у тебя типы есть — убери any
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const count = useMemo(() => {
    if (!mounted) return 0;
    if (!items) return 0;
    // items может быть массивом или объектом — подстрахуемся
    if (Array.isArray(items)) return items.reduce((s, x) => s + (x.qty ?? 1), 0);
    return Object.values(items).reduce((s: number, x: any) => s + (x.qty ?? 1), 0);
  }, [items, mounted]);

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center justify-center gap-2 rounded-full
                 bg-neutral-900 px-5 py-2.5 text-sm font-semibold tracking-wide text-white
                 transition-[background-color,transform] duration-300
                 hover:bg-neutral-800 active:scale-[0.98]"
    >
      <span aria-hidden>🧴</span>
      <span>Корзина</span>

      {/* badge */}
      <span
        suppressHydrationWarning
        className="ml-1 inline-flex min-w-6 items-center justify-center rounded-full
                   bg-white/15 px-2 py-0.5 text-[11px] font-semibold"
      >
        {mounted ? count : 0}
      </span>
    </Link>
  );
}
