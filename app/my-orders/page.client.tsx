"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Saved = { orderId: string; savedAt: number };

export default function MyOrdersClient() {
  const [list, setList] = useState<Saved[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("passion_orders");
    setList(raw ? JSON.parse(raw) : []);
  }, []);

  function clear() {
    localStorage.removeItem("passion_orders");
    localStorage.removeItem("passion_last_order");
    setList([]);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Мои заказы</h1>
        {list.length > 0 && (
          <button onClick={clear} className="text-sm text-neutral-500 hover:text-neutral-800">
            Очистить
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="border rounded-xl p-6 text-sm text-neutral-500">
          Пока нет сохранённых заказов. Открой страницу отслеживания — и заказ появится здесь.
        </div>
      ) : (
        <div className="border rounded-xl divide-y">
          {list.map((x) => (
            <div key={x.orderId} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Заказ</div>
                <div className="font-medium">#{x.orderId}</div>
                <div className="text-xs text-neutral-500">
                  Сохранён: {new Date(x.savedAt).toLocaleString()}
                </div>
              </div>

              <Link
                href={`/order/${x.orderId}`}
                className="border rounded-xl px-4 py-2 text-sm hover:bg-neutral-50"
              >
                Открыть
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
