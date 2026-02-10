"use client";

import { useEffect, useState } from "react";

function formatMoney(n: number) {
  try {
    return n.toLocaleString("ru-RU");
  } catch {
    return String(n);
  }
}

function formatDate(ts: number) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("ru-RU");
  } catch {
    return String(ts);
  }
}

function statusLabel(s: string) {
  switch (s) {
    case "pending_payment":
      return "Не оплачено";
    case "paid":
      return "Оплачено";
    case "confirmed":
      return "Подтверждён";
    case "shipped":
      return "Отправлен";
    case "done":
      return "Завершён";
    case "canceled":
      return "Отменён";
    default:
      return s || "—";
  }
}

type OrderRow = {
  orderId: string;
  status: string;
  createdAt: number;
  totalPrice: number;
  itemsCount: number;
  customer: {
    name?: string;
    phone?: string;
    telegram?: string | null;
  };
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "LOAD_FAILED");
      setOrders(data.orders || []);
    } catch (e: any) {
      setErr(e?.message || "Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
            PASSION / ADMIN
          </div>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Заказы</h1>
          <p className="mt-1 text-sm text-neutral-600">Последние заявки и заказы.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="rounded-2xl border px-4 py-2.5 text-sm hover:bg-neutral-50"
          >
            Обновить
          </button>
          <button
            onClick={logout}
            className="rounded-2xl border px-4 py-2.5 text-sm hover:bg-neutral-50"
          >
            Выйти
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-6 rounded-2xl border bg-white/60 p-4 text-sm text-red-600">
          {err}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-3xl border bg-white/60 backdrop-blur shadow-sm">
        <div className="grid grid-cols-[140px_160px_1fr_140px_120px] gap-3 border-b px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">
          <div>Заказ</div>
          <div>Дата</div>
          <div>Клиент</div>
          <div className="text-right">Сумма</div>
          <div>Статус</div>
        </div>

{loading ? (
  <div className="px-5 py-8 text-sm text-neutral-600">Загрузка...</div>
) : orders.length ? (
  orders.map((o) => {
    const id = String(o?.orderId ?? "").trim();
    if (!id || id === "undefined" || id === "null") return null;

    return (
      <a
        key={id}
        href={`/admin/orders/${encodeURIComponent(id)}`}
        className="grid grid-cols-[140px_160px_1fr_140px_120px] gap-3 px-5 py-4 text-sm hover:bg-black/[0.03]"
      >
        <div className="font-mono">{id}</div>
        <div className="text-neutral-600">{formatDate(o.createdAt)}</div>

        <div className="min-w-0">
          <div className="truncate font-medium">
            {o.customer?.name || "—"}
          </div>
          <div className="truncate text-xs text-neutral-500">
            {o.customer?.phone || "—"}
            {o.customer?.telegram
              ? ` · @${String(o.customer.telegram).replace(/^@/, "")}`
              : ""}
            {o.itemsCount ? ` · ${o.itemsCount} шт.` : ""}
          </div>
        </div>

        <div className="text-right font-semibold tabular-nums">
          {formatMoney(Number(o.totalPrice || 0))} ₽
        </div>

        <div className="text-neutral-700">
          {statusLabel(o.status)}
        </div>
      </a>
    );
  })
) : (
  <div className="px-5 py-8 text-sm text-neutral-600">
    Пока нет заказов.
  </div>
)}
      </div>
    </main>
  );
}
