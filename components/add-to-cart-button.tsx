"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/app/cart-context";

export default function AddToCartButton({ product }: { product: any }) {
  const { add } = useCart();
  const [state, setState] = useState<"idle" | "added">("idle");

  const onAdd = () => {
    if (state !== "idle") return;

    add(product);
    setState("added");

    // через 1.2 сек вернём обратно в обычное состояние
    window.setTimeout(() => setState("idle"), 1200);
  };

  // Общие классы (твой премиум-стиль + плавность)
  const base =
    "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold tracking-wide text-white " +
    "transition-[background-color,transform,opacity] duration-300 ease-out active:scale-[0.98]";

  // 1) Пока idle — обычная кнопка “В корзину”
  if (state === "idle") {
    return (
      <button onClick={onAdd} className={[base, "bg-neutral-900 hover:bg-neutral-800"].join(" ")}>
        В корзину
      </button>
    );
  }

  // 2) После добавления — ссылка “В корзину →”
  return (
    <Link
      href="/cart"
      className={[base, "bg-emerald-600 hover:bg-emerald-700 opacity-95"].join(" ")}
    >
      В корзину →
    </Link>
  );
}
