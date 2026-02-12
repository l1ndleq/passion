"use client";

import * as React from "react";
import { useCart } from "@/components/cart/CartProvider";

type ProductMini = {
  id: string;
  title: string;
  price: number;
  image?: string;
};

export default function AddToCartButton({
  product,
  className = "",
}: {
  product: ProductMini;
  className?: string;
}) {
  const cart = useCart() as any;
  const items = cart?.items ?? [];
  const add = cart?.add;
  const setQty = cart?.setQty;
  const remove = cart?.remove;

  const current = Array.isArray(items) ? items.find((i: any) => i?.id === product.id) : null;
  const qty = Number(current?.qty || 0);

  const inc = () => {
    if (typeof add === "function") {
      add({
        id: product.id,
        title: product.title,
        price: product.price,
        qty: 1,
        image: product.image,
      });
      return;
    }
    if (typeof setQty === "function") setQty(product.id, qty + 1);
  };

  const dec = () => {
    if (qty <= 1) {
      if (typeof remove === "function") remove(product.id);
      else if (typeof setQty === "function") setQty(product.id, 0);
      return;
    }
    if (typeof setQty === "function") setQty(product.id, qty - 1);
  };

  // --- 1) НЕТ В КОРЗИНЕ -> обычная кнопка
  if (!qty) {
    return (
      <button
        type="button"
        onClick={inc}
        className={[
          "inline-flex items-center justify-center",
          "h-10 rounded-2xl px-4",
          "bg-black text-white text-[12px] uppercase tracking-[0.22em]",
          "hover:opacity-90 transition",
          className,
        ].join(" ")}
      >
        В корзину
      </button>
    );
  }

  // --- 2) ЕСТЬ В КОРЗИНЕ -> stepper - qty +
  return (
    <div
      className={[
        "inline-flex items-center",
        "h-10 rounded-2xl border border-black/10 bg-white",
        "overflow-hidden",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={dec}
        className="h-10 w-10 grid place-items-center hover:bg-black/5 transition"
        aria-label="Уменьшить количество"
      >
        <span className="text-[18px] leading-none">−</span>
      </button>

      <div className="min-w-[38px] px-2 text-center text-[12px] font-medium tabular-nums">
        {qty}
      </div>

      <button
        type="button"
        onClick={inc}
        className="h-10 w-10 grid place-items-center hover:bg-black/5 transition"
        aria-label="Увеличить количество"
      >
        <span className="text-[18px] leading-none">+</span>
      </button>
    </div>
  );
}
