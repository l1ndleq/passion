"use client";

import Link from "next/link";
import { useCart } from "../cart-context";

export default function CartPage() {
  const { items, remove, setQty, totalPrice } = useCart();

  if (!items.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Корзина</h1>
        <p className="mt-4">Пока пусто.</p>
        <Link className="underline" href="/">
          Перейти к товарам
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Корзина</h1>

      <div className="mt-6 space-y-4">
        {items.map((i) => (
          <div key={i.id} className="p-4 border rounded-2xl flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">{i.title}</div>
              <div className="text-sm opacity-70">{i.price} ₽</div>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border rounded-xl" onClick={() => setQty(i.id, i.qty - 1)}>
                -
              </button>
              <div className="w-8 text-center">{i.qty}</div>
              <button className="px-3 py-1 border rounded-xl" onClick={() => setQty(i.id, i.qty + 1)}>
                +
              </button>
            </div>

            <button className="underline" onClick={() => remove(i.id)}>
              Удалить
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-lg font-semibold">Итого: {totalPrice} ₽</div>
        <Link href="/checkout" className="px-4 py-2 rounded-xl bg-black text-white">
          Оформить заказ
        </Link>
      </div>
    </div>
  );
}