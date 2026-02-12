"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

type Props = {
  className?: string;
  variant?: "text" | "icon";
};

export default function CartLinkClientOnly({ className = "", variant = "text" }: Props) {
  const cart = useCart();

  // защищаемся от любых форм/undefined
  const items = (cart as any)?.items ?? [];
  const count = Array.isArray(items)
    ? items.reduce((sum: number, i: any) => sum + (Number(i?.qty) || 0), 0)
    : 0;

  // 🖥 DESKTOP — текстовая версия + бейдж
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

  // 📱 MOBILE — иконка (кликабельная зона 44x44) + бейдж
  return (
    <Link
      href="/cart"
      aria-label={`Корзина: ${count}`}
      className={[
        "relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full",
        "border border-black/10 bg-white/60 backdrop-blur",
        "hover:bg-black/[0.04] transition",
        className,
      ].join(" ")}
    >
      {/* SVG корзины */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="text-black/75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-black px-1 text-[9px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
