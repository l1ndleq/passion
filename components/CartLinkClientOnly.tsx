"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";


type Props = {
  className?: string;
};

export default function CartLinkClientOnly({ className = "" }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { items } = useCart();

  const count = useMemo(() => {
    const list: any[] = Array.isArray(items) ? (items as any[]) : [];
    const withQty = list.some((x) => typeof x?.quantity === "number");
    if (withQty) return list.reduce((sum, x) => sum + (Number(x?.quantity) || 0), 0);
    return list.length;
  }, [items]);

  // ✅ fallback стиль (если вдруг не прокинули className из layout)
  const fallback =
    "group relative inline-flex items-center text-[11px] uppercase tracking-[0.22em] " +
    "text-black/60 transition-colors hover:text-black " +
    "after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full " +
    "after:origin-left after:scale-x-0 after:bg-black/60 " +
    "after:transition-transform after:duration-300 hover:after:scale-x-100";

  const linkClass = (className?.trim() ? className : fallback) + " inline-flex items-center";

  return (
    <Link href="/cart" className={linkClass}>
      Корзина

      {/* ✅ не показываем число до mounted, чтобы не было hydration mismatch */}
      {mounted ? (
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/10 px-1.5 text-[10px] text-black/70">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
