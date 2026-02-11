"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

type Props = {
  className?: string;
  variant?: "text" | "icon";
};

export default function CartLinkClientOnly({
  className = "",
  variant = "text",
}: Props) {
  const { items } = useCart();

  const count = items.reduce((sum, i) => sum + i.qty, 0);

  // 🖥 DESKTOP — текстовая версия
  if (variant === "text") {
    return (
      <Link href="/cart" className={className}>
        Корзина
        {count > 0 && (
          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black/10 px-2 text-[10px] font-medium">
            {count}
          </span>
        )}
      </Link>
    );
  }

  // 📱 MOBILE — иконка
  return (
    <Link
      href="/cart"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white hover:bg-black/5 transition"
    >
      {/* SVG корзины */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-black text-[9px] text-white font-medium px-1">
          {count}
        </span>
      )}
    </Link>
  );
}
