"use client";

import * as React from "react";
import { useCart } from "@/components/cart/CartProvider";

type ProductMini = {
  id: string;
  title?: string;
  name?: string;
  price: number;
  image?: string;
};

function pickCartApi(cart: any) {
  const add =
    cart?.add ??
    cart?.addItem ??
    cart?.addToCart ??
    cart?.addProduct ??
    cart?.push;

  const setQty =
    cart?.setQty ??
    cart?.updateQty ??
    cart?.changeQty ??
    cart?.setQuantity;

  const remove =
    cart?.remove ??
    cart?.removeItem ??
    cart?.deleteItem ??
    cart?.del;

  const items = cart?.items ?? cart?.cart ?? [];

  return { add, setQty, remove, items };
}

export default function AddToCartButton({
  product,
  className = "",
  compact = false,
}: {
  product: ProductMini;
  className?: string;
  compact?: boolean; // если захочешь более компактно в 2 колонки
}) {
  const cart = useCart() as any;
  const { add, setQty, remove, items } = pickCartApi(cart);

  const list = Array.isArray(items) ? items : [];
  const current = list.find((i: any) => i?.id === product.id);
  const qty = Number(current?.qty || 0);

  const title = String(product.title || product.name || "").trim();

  const btnBase =
    "inline-flex items-center justify-center select-none " +
    "uppercase tracking-[0.22em] " +
    "transition";

  const h = compact ? "h-9" : "h-10";
  const pad = compact ? "px-4" : "px-5";
  const round = "rounded-full"; // ✅ максимально “круглая”, как ты хотел

  const inc = () => {
    // 1) если есть setQty — самый надёжный путь
    if (typeof setQty === "function") {
      setQty(product.id, qty + 1);
      return;
    }

    // 2) если есть add — добавляем 1
    if (typeof add === "function") {
      add({
        id: product.id,
        // подстрахуем два поля: где-то ожидают title, где-то name
        title: title || String(product.id),
        name: title || String(product.id),
        price: product.price,
        qty: 1,
        image: product.image,
      });
      return;
    }

    console.warn("Cart API: no add/setQty method found");
  };

  const dec = () => {
    if (qty <= 1) {
      if (typeof remove === "function") {
        remove(product.id);
        return;
      }
      if (typeof setQty === "function") {
        setQty(product.id, 0);
        return;
      }
      console.warn("Cart API: no remove/setQty method found");
      return;
    }

    if (typeof setQty === "function") {
      setQty(product.id, qty - 1);
      return;
    }

    // если setQty нет, но есть add — без setQty уменьшить нельзя
    console.warn("Cart API: cannot decrement without setQty");
  };

  // --- НЕТ В КОРЗИНЕ -> кнопка
  if (!qty) {
    return (
      <button
        type="button"
        onClick={inc}
        className={[
          btnBase,
          h,
          pad,
          round,
          "bg-black text-white text-[11px] hover:opacity-90",
          className,
        ].join(" ")}
      >
        В корзину
      </button>
    );
  }

  // --- ЕСТЬ В КОРЗИНЕ -> степпер
  return (
    <div
      className={[
        "inline-flex items-center overflow-hidden",
        h,
        round,
        "border border-black/10 bg-white/70 backdrop-blur",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={dec}
        className={[
          "grid place-items-center",
          compact ? "w-9" : "w-10",
          "h-full hover:bg-black/[0.04] transition",
        ].join(" ")}
        aria-label="Уменьшить количество"
      >
        <span className="text-[18px] leading-none text-black/80">−</span>
      </button>

      <div className="min-w-[38px] px-2 text-center text-[12px] font-medium tabular-nums text-black/85">
        {qty}
      </div>

      <button
        type="button"
        onClick={inc}
        className={[
          "grid place-items-center",
          compact ? "w-9" : "w-10",
          "h-full hover:bg-black/[0.04] transition",
        ].join(" ")}
        aria-label="Увеличить количество"
      >
        <span className="text-[18px] leading-none text-black/80">+</span>
      </button>
    </div>
  );
}
