"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type PublicOrder = {
  orderId: string;
  status: string;
  createdAt?: number;
  updatedAt?: number;
  totalPrice?: number;
  items?: Array<{ title: string; qty: number; price: number }>;
};

const STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В обработке",
  shipped: "Отправлен",
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
    case "shipped":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-neutral-50 text-neutral-700 border-neutral-200";
  }
}

function formatDate(x?: number) {
  if (!x) return "—";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function extractOrderId(pathname: string | null) {
  if (!pathname) return null;
  // ожидаем /order/<id>
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("order");
  if (idx === -1) return null;
  return parts[idx + 1] ?? null;
}

const ORDER_ACCESS_TOKEN_STORAGE_PREFIX = "passion_order_access_token:";

export default function OrderTrackingClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [accessToken, setAccessToken] = useState("");

  // 1) достаём orderId из URL
  useEffect(() => {
    const id = extractOrderId(pathname);
    setOrderId(id);
    setReady(true);
  }, [pathname]);

  // 2) сохраняем последний заказ + список последних 10
  useEffect(() => {
    if (!orderId) return;

    const KEY = "passion_orders";
    let list: Array<{ orderId: string; savedAt: number }> = [];

    try {
      const raw = localStorage.getItem(KEY);
      list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    const next = [
      { orderId, savedAt: Date.now() },
      ...list.filter((x) => x?.orderId && x.orderId !== orderId),
    ].slice(0, 10);

    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      localStorage.setItem("passion_last_order", orderId);
    } catch {}
  }, [orderId]);

  const queryAccessToken = (searchParams.get("t") || "").trim();

  useEffect(() => {
    if (!orderId) return;

    const storageKey = `${ORDER_ACCESS_TOKEN_STORAGE_PREFIX}${orderId}`;
    let incomingToken = queryAccessToken;

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (hash) {
      const hashToken = new URLSearchParams(hash).get("t")?.trim() || "";
      if (hashToken) incomingToken = hashToken;
    }

    if (incomingToken) {
      setAccessToken(incomingToken);
      try {
        sessionStorage.setItem(storageKey, incomingToken);
      } catch {}

      const cleanPath = `/order/${encodeURIComponent(orderId)}`;
      if (
        window.location.pathname !== cleanPath ||
        window.location.search ||
        window.location.hash
      ) {
        window.history.replaceState(null, "", cleanPath);
      }
      return;
    }

    try {
      setAccessToken(sessionStorage.getItem(storageKey) || "");
    } catch {
      setAccessToken("");
    }
  }, [orderId, queryAccessToken]);

  const GET_URL = orderId ? `/api/orders/${orderId}` : null;

  async function load() {
    if (!GET_URL || !orderId) return;

    setLoading(true);
    setError(null);

    try {
      const headers = accessToken ? { "x-order-access-token": accessToken } : undefined;
      const res = await fetch(GET_URL, { cache: "no-store", headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || data?.message || "Не удалось загрузить заказ");
        setOrder(null);
        return;
      }

      if (data?.ok === false || !data?.order) {
        setError(data?.error || data?.message || "Заказ не найден");
        setOrder(null);
        return;
      }

      setOrder(data.order as PublicOrder);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ошибка сети");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  // 3) грузим заказ
  useEffect(() => {
    if (ready && orderId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, orderId, accessToken]);

  if (!ready) return null;

  if (!orderId) {
    return <div className="p-6 text-red-500 text-sm">ORDER_ID_REQUIRED</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-neutral-500">Отслеживание заказа</div>
          <div className="mt-1 text-2xl font-semibold">
            #{order?.orderId ?? orderId}
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Создан: {formatDate(order?.createdAt)} • Обновлён:{" "}
            {formatDate(order?.updatedAt)}
          </div>
        </div>

        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="border rounded-xl px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Скопировать ссылку
        </button>

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
        <>
          <div className="border rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-neutral-500">Статус</div>
              <div className="text-lg font-medium">
                {STATUS_LABEL[order.status] ?? order.status}
              </div>
            </div>

            <span
              className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${statusBadgeClass(
                order.status
              )}`}
            >
              {order.status}
            </span>
          </div>

          <div className="border rounded-xl p-4">
            <div className="font-medium mb-3">Состав заказа</div>

            {order.items?.length ? (
              <>
                {order.items.map((it, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-sm py-1"
                  >
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

          <div className="text-xs text-neutral-500">
            Если есть вопросы по заказу — напишите нам, указав номер заказа.
          </div>
        </>
      )}
    </div>
  );
}
