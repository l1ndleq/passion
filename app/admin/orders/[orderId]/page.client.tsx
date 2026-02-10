"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type AdminOrder = {
  orderId?: string;
  status?: string;
  createdAt?: string | number;
  updatedAt?: string | number;

  // у тебя в API есть totalPrice
  totalPrice?: number;

  // эти поля могут отсутствовать (у тебя на скрине были "—")
  paymentStatus?: string;
  paymentId?: string;

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
    message?: string; // если у тебя есть message в customer — покажем
  };
};

const STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В обработке",
  completed: "Завершён",
  cancelled: "Отменён",
};

function statusBadgeClass(status?: string) {
  switch (status) {
    case "paid":
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    case "pending_payment":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    case "processing":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-neutral-50 text-neutral-700 border-neutral-200";
  }
}

function formatDate(x?: string | number) {
  if (!x) return "—";
  const d = typeof x === "number" ? new Date(x) : new Date(String(x));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

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
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || data?.message || "Не удалось загрузить заказ");
        setOrder(null);
        return;
      }

      // ожидаем { ok: true, order: {...} }
      if (data?.ok === false || !data?.order) {
        setError(data?.error || data?.message || "Заказ не найден");
        setOrder(null);
        return;
      }

      setOrder(data.order as AdminOrder);
    } catch (e: any) {
      setError(e?.message || "Ошибка сети");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(nextStatus: string) {
    if (!STATUS_URL) return;

    const label = STATUS_LABEL[nextStatus] ?? nextStatus;
    if (!confirm(`Сменить статус на: ${label}?`)) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(STATUS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
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
    if (ready && orderId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, orderId]);

  if (!ready) return null;

  if (!orderId) {
    return <div className="p-6 text-red-500 text-sm">ORDER_ID_REQUIRED</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-neutral-500">Заказ</div>

          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold">#{order?.orderId ?? orderId}</div>

            {order?.status && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${statusBadgeClass(
                  order.status
                )}`}
              >
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            )}
          </div>

          <div className="mt-2 text-xs text-neutral-500">
            Создан: {formatDate(order?.createdAt)} • Обновлён: {formatDate(order?.updatedAt)}
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
        <div className="border rounded-xl p-6 text-sm text-neutral-500">Загрузка…</div>
      ) : !order ? (
        <div className="border rounded-xl p-6 text-sm text-neutral-500">Заказ не найден</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Левая колонка */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border rounded-xl p-4">
              <div className="font-medium mb-3">Состав заказа</div>

              {order.items?.length ? (
                <>
                  {order.items.map((it, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1">
                      <span>{it.title}</span>
                      <span>
                        {it.qty} × {it.price}
                      </span>
                    </div>
                  ))}

                  {typeof order.totalPrice === "number" && (
                    <div className="mt-3 flex justify-between border-t pt-3 text-sm">
                      <span className="text-neutral-500">Итого</span>
                      <span className="font-semibold">{order.totalPrice} ₽</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-neutral-500">Нет позиций</div>
              )}
            </div>

            <div className="border rounded-xl p-4 space-y-2">
              <div className="font-medium">Клиент</div>
              <div className="text-sm text-neutral-700">{order.customer?.name || "—"}</div>
              <div className="text-sm text-neutral-500">Тел: {order.customer?.phone || "—"}</div>
              {order.customer?.email ? (
                <div className="text-sm text-neutral-500">Email: {order.customer.email}</div>
              ) : null}
              {order.customer?.address ? (
                <div className="text-sm text-neutral-500">Адрес: {order.customer.address}</div>
              ) : null}
              {order.customer?.comment ? (
                <div className="text-sm text-neutral-700 whitespace-pre-wrap mt-2">
                  {order.customer.comment}
                </div>
              ) : null}
              {order.customer?.message ? (
                <div className="text-sm text-neutral-700 whitespace-pre-wrap mt-2">
                  {order.customer.message}
                </div>
              ) : null}
            </div>
          </div>

          {/* Правая колонка */}
          <div className="border rounded-xl p-4 space-y-3">
            <div>
              <div className="text-xs text-neutral-500">Статус</div>
              <select
                value={order.status ?? "new"}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={saving}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="new">new</option>
                <option value="pending_payment">pending_payment</option>
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
