"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type AdminOrder = {
  orderId?: string;
  status?: string;
  paymentStatus?: string;
  paymentId?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  total?: number;
  currency?: string;
  items?: Array<{
    title: string;
    qty: number;
    price: number;
  }>;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    comment?: string;
  };
};

export default function OrderAdminClient() {
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<AdminOrder | null>(null);

  // ⬇️ ЕДИНСТВЕННОЕ место, где определяется orderId
  useEffect(() => {
    if (!pathname) return;

    const parts = pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1] ?? null;

    setOrderId(id);
    setReady(true);
  }, [pathname]);

  const GET_URL = orderId ? `/api/admin/orders/${orderId}` : null;
  const STATUS_URL = orderId ? `/api/admin/orders/${orderId}/status` : null;

  async function load() {
  if (!GET_URL || !orderId) return;

  setLoading(true);
  setError(null);

  try {
    const res = await fetch(GET_URL, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) {
      setError("Не удалось загрузить заказ");
      setOrder(null);
      return;
    }

    setOrder(data.order);
  } catch {
    setError("Ошибка сети");
    setOrder(null);
  } finally {
    setLoading(false);
  }
}

// 👇 ВОТ СЮДА ВСТАВЛЯЕШЬ
async function updateStatus(status: string) {
  if (!STATUS_URL) return;

  setSaving(true);
  setError(null);

  try {
    const res = await fetch(STATUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error || data?.message || `HTTP ${res.status}`);
      return;
    }

    await load();
  } catch (e: any) {
    setError(e?.message || "Ошибка сети");
  } finally {
    setSaving(false);
  }
}


  useEffect(() => {
    if (ready && orderId) {
      load();
    }
  }, [ready, orderId]);

  // ❗ НИЧЕГО не рендерим, пока pathname не готов
  if (!ready) return null;

  if (!orderId) {
    return (
      <div className="p-6 text-red-500 text-sm">
        ORDER_ID_REQUIRED
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-neutral-500">Заказ</div>
          <div className="text-2xl font-semibold">
            #{order?.orderId ?? orderId}
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="border rounded-xl px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          Обновить
        </button>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="border rounded-xl p-6 text-sm text-neutral-500">
          Загрузка…
        </div>
      ) : !order ? (
        <div className="border rounded-xl p-6 text-sm text-neutral-500">
          Заказ не найден
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 border rounded-xl p-4">
  <div className="font-medium mb-3">Состав заказа</div>

  {order.items?.length ? (
    order.items.map((it, i) => (
      <div key={i} className="flex justify-between items-center text-sm py-1">
        <span>{it.title}</span>
        <span>
          {it.qty} × {it.price}
        </span>
      </div>
    ))
  ) : (
    <div className="text-sm text-neutral-500">Нет позиций</div>
  )}
</div>



          <div className="border rounded-xl p-4 space-y-3">
            <div>
              <div className="text-xs text-neutral-500">Статус</div>
              <select
                value={order.status}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={saving}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="new">new</option>
                <option value="paid">paid</option>
                <option value="processing">processing</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>

            <div className="text-xs text-neutral-500">
              Payment status: {order.paymentStatus ?? "—"}
            </div>
            <div className="text-xs text-neutral-500 break-all">
              Payment ID: {order.paymentId ?? "—"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
