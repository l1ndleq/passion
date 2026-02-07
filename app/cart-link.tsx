"use client";

import Link from "next/link";
import { useCart } from "./cart-context";

export function CartLink() {
  const { totalCount } = useCart();

  return (
    <Link href="/cart" className="underline">
      Корзина{totalCount ? ` (${totalCount})` : ""}
    </Link>
  );
}