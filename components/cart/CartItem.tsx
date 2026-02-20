"use client";

import Image from "next/image";
import { sanitizeImageSrc } from "@/app/lib/xss";

type CartLine = {
  id: string;
  title: string;
  subtitle?: string; // объем/вариант
  price: number; // за 1 шт
  qty: number;
  image?: string;
};

export function CartItem({
  item,
  onInc,
  onDec,
  onRemove,
}: {
  item: CartLine;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  const lineTotal = item.price * item.qty;
  const safeImage = sanitizeImageSrc(item.image, "/images/placeholder-product.jpg");

  return (
    <div className="rounded-2xl border bg-white/60 backdrop-blur p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-white">
          {item.image ? (
            <Image
              src={safeImage}
              alt={item.title}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-neutral-50 to-neutral-100" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{item.title}</div>
              {item.subtitle ? (
                <div className="mt-0.5 truncate text-sm text-neutral-500">{item.subtitle}</div>
              ) : null}
            </div>

            <button
              onClick={onRemove}
              className="rounded-xl border px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
              aria-label="Удалить из корзины"
            >
              Удалить
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border bg-white px-2 py-1.5">
              <button
                onClick={onDec}
                className="h-9 w-9 rounded-xl border bg-white text-lg hover:bg-neutral-50 disabled:opacity-40"
                aria-label="Уменьшить количество"
                disabled={item.qty <= 1}
              >
                −
              </button>

              <div className="w-10 text-center text-sm font-semibold tabular-nums">
                {item.qty}
              </div>

              <button
                onClick={onInc}
                className="h-9 w-9 rounded-xl border bg-white text-lg hover:bg-neutral-50"
                aria-label="Увеличить количество"
              >
                +
              </button>
            </div>

            <div className="text-right">
              <div className="text-sm text-neutral-500">
                {item.price.toLocaleString("ru-RU")} ₽ / шт
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {lineTotal.toLocaleString("ru-RU")} ₽
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
