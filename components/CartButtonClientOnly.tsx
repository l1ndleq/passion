"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

type Props = {
  className?: string;
};

export default function CartButtonClientOnly({ className = "" }: Props) {
  const { items } = useCart();

  const count = items.reduce((sum, i: any) => sum + (Number(i.qty) || 1), 0);

  return (
    <Link
      href="/cart"
      aria-label={`Корзина: ${count}`}
      className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/10 bg-white hover:bg-black/[0.04] transition ${className}`}
    >
      {/* bag icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-black/75"
      >
        <path d="M6 2l1 4h10l1-4" />
        <path d="M5 6h14l-1.2 14H6.2L5 6z" />
        <path d="M9 10v0" />
        <path d="M15 10v0" />
      </svg>

      {count > 0 && (
        <span className="absolute -top-1 -right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-black px-1 text-[9px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
