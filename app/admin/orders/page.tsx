"use client";

import { useCallback, useEffect, useState } from "react";

function formatMoney(n: number) {
  try {
    return n.toLocaleString("ru-RU");
  } catch {
    return String(n);
  }
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("ru-RU");
  } catch {
    return String(ts);
  }
}

function statusLabel(s: string) {
  switch (s) {
    case "new":
      return "Новый";
    case "pending_payment":
      return "Не оплачено";
    case "paid":
      return "Оплачено";
    case "processing":
      return "В обработке";
    case "completed":
      return "Завершен";
    case "cancelled":
      return "Отменен";
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

type PromoType = "percent" | "fixed";

type PromoCodeRow = {
  code: string;
  type: PromoType;
  value: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  maxUses: number | null;
  usedCount: number;
};

type PromoForm = {
  code: string;
  type: PromoType;
  value: string;
  maxUses: string;
  expiresAtLocal: string;
  active: boolean;
};

const PROMO_CODE_RE = /^[A-Z0-9_-]{3,32}$/;

function toLocalDateTimeInput(ts: number | null) {
  if (!ts) return "";
  const date = new Date(ts);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseLocalDateTimeInput(value: string) {
  const v = String(value || "").trim();
  if (!v) return null;
  const ts = Date.parse(v);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return Math.floor(ts);
}

function promoValueLabel(promo: PromoCodeRow) {
  return promo.type === "percent" ? `${promo.value}%` : `${formatMoney(promo.value)} ₽`;
}

const INITIAL_PROMO_FORM: PromoForm = {
  code: "",
  type: "percent",
  value: "10",
  maxUses: "",
  expiresAtLocal: "",
  active: true,
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);

  const [promos, setPromos] = useState<PromoCodeRow[]>([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [promosErr, setPromosErr] = useState<string | null>(null);
  const [promosInfo, setPromosInfo] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState<PromoForm>(INITIAL_PROMO_FORM);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoActionCode, setPromoActionCode] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersErr(null);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "LOAD_FAILED");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Ошибка загрузки заказов";
      setOrdersErr(message);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadPromos = useCallback(async () => {
    setPromosLoading(true);
    setPromosErr(null);
    try {
      const res = await fetch("/api/admin/promocodes", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "PROMOCODES_LOAD_FAILED");
      setPromos(Array.isArray(data.promocodes) ? data.promocodes : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Ошибка загрузки промокодов";
      setPromosErr(message);
    } finally {
      setPromosLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadOrders(), loadPromos()]);
  }, [loadOrders, loadPromos]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  }

  function setPromoField<K extends keyof PromoForm>(key: K, value: PromoForm[K]) {
    setPromoForm((prev) => ({ ...prev, [key]: value }));
  }

  async function savePromo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPromosErr(null);
    setPromosInfo(null);

    const code = String(promoForm.code || "").trim().toUpperCase();
    if (!PROMO_CODE_RE.test(code)) {
      setPromosErr("Код промокода: только A-Z, 0-9, _, - (от 3 до 32 символов).");
      return;
    }

    const valueNum = Number(promoForm.value);
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      setPromosErr("Размер скидки должен быть больше нуля.");
      return;
    }

    if (promoForm.type === "percent" && valueNum > 95) {
      setPromosErr("Процентная скидка должна быть от 1 до 95.");
      return;
    }

    const maxUsesNum = promoForm.maxUses.trim() ? Number(promoForm.maxUses) : null;
    if (maxUsesNum != null && (!Number.isFinite(maxUsesNum) || maxUsesNum <= 0)) {
      setPromosErr("Лимит применений должен быть положительным числом.");
      return;
    }

    const expiresAt = parseLocalDateTimeInput(promoForm.expiresAtLocal);
    if (promoForm.expiresAtLocal.trim() && !expiresAt) {
      setPromosErr("Некорректная дата окончания промокода.");
      return;
    }

    try {
      setPromoSaving(true);
      const res = await fetch("/api/admin/promocodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          type: promoForm.type,
          value: Math.floor(valueNum),
          active: promoForm.active,
          maxUses: maxUsesNum == null ? null : Math.floor(maxUsesNum),
          expiresAt,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "PROMOCODE_SAVE_FAILED");

      setPromosInfo(`Промокод ${code} сохранен.`);
      setPromoForm((prev) => ({ ...prev, code: "" }));
      await loadPromos();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Ошибка сохранения промокода";
      setPromosErr(message);
    } finally {
      setPromoSaving(false);
    }
  }

  async function togglePromoActive(code: string, active: boolean) {
    setPromosErr(null);
    setPromosInfo(null);
    setPromoActionCode(code);
    try {
      const res = await fetch(`/api/admin/promocodes/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "PROMOCODE_PATCH_FAILED");
      setPromosInfo(`Промокод ${code} ${active ? "включен" : "отключен"}.`);
      await loadPromos();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Ошибка обновления промокода";
      setPromosErr(message);
    } finally {
      setPromoActionCode(null);
    }
  }

  async function removePromo(code: string) {
    setPromosErr(null);
    setPromosInfo(null);
    const ok = window.confirm(`Удалить промокод ${code}?`);
    if (!ok) return;

    setPromoActionCode(code);
    try {
      const res = await fetch(`/api/admin/promocodes/${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "PROMOCODE_DELETE_FAILED");
      setPromosInfo(`Промокод ${code} удален.`);
      await loadPromos();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Ошибка удаления промокода";
      setPromosErr(message);
    } finally {
      setPromoActionCode(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] opacity-60">PASSION / АДМИН</div>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Заказы</h1>
          <p className="mt-1 text-sm text-neutral-600">Последние заявки и заказы.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
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

      <section className="mt-6 rounded-3xl border bg-white/70 p-5 shadow-sm backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Промокоды и скидки</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Промокод вводится клиентом при оформлении заказа.
            </p>
          </div>
        </div>

        <form onSubmit={savePromo} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            className="h-11 rounded-xl border border-neutral-200 px-3 text-sm uppercase outline-none focus:border-neutral-400"
            placeholder="Код (например WELCOME10)"
            value={promoForm.code}
            onChange={(e) => setPromoField("code", e.target.value.toUpperCase())}
            disabled={promoSaving}
            maxLength={32}
          />

          <select
            className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
            value={promoForm.type}
            onChange={(e) => setPromoField("type", e.target.value as PromoType)}
            disabled={promoSaving}
          >
            <option value="percent">Процент (%)</option>
            <option value="fixed">Фикс (₽)</option>
          </select>

          <input
            type="number"
            min={1}
            max={promoForm.type === "percent" ? 95 : undefined}
            className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
            placeholder={promoForm.type === "percent" ? "Скидка, %" : "Скидка, ₽"}
            value={promoForm.value}
            onChange={(e) => setPromoField("value", e.target.value)}
            disabled={promoSaving}
          />

          <input
            type="number"
            min={1}
            className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
            placeholder="Лимит использований (опц.)"
            value={promoForm.maxUses}
            onChange={(e) => setPromoField("maxUses", e.target.value)}
            disabled={promoSaving}
          />

          <input
            type="datetime-local"
            className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
            value={promoForm.expiresAtLocal}
            onChange={(e) => setPromoField("expiresAtLocal", e.target.value)}
            disabled={promoSaving}
          />

          <button
            type="submit"
            disabled={promoSaving}
            className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {promoSaving ? "Сохраняем..." : "Сохранить промокод"}
          </button>
        </form>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-black"
            checked={promoForm.active}
            onChange={(e) => setPromoField("active", e.target.checked)}
            disabled={promoSaving}
          />
          <span>Сразу включить после сохранения</span>
        </label>

        {promosErr ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {promosErr}
          </div>
        ) : null}

        {promosInfo ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {promosInfo}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {promosLoading ? (
            <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-neutral-600">
              Загружаем промокоды...
            </div>
          ) : promos.length ? (
            promos.map((promo) => (
              <div
                key={promo.code}
                className="rounded-2xl border bg-white p-4 sm:flex sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-neutral-100 px-2 py-1 font-mono text-sm font-semibold">
                      {promo.code}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-1 text-xs ${
                        promo.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {promo.active ? "Активен" : "Отключен"}
                    </span>
                    <span className="rounded-lg bg-sky-100 px-2 py-1 text-xs text-sky-700">
                      {promoValueLabel(promo)}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-neutral-600">
                    Использовано: {promo.usedCount}
                    {promo.maxUses ? ` / ${promo.maxUses}` : " / без лимита"}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Истекает: {promo.expiresAt ? formatDate(promo.expiresAt) : "бессрочно"}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Обновлен: {formatDate(promo.updatedAt)}
                  </div>
                </div>

                <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
                  <button
                    onClick={() => togglePromoActive(promo.code, !promo.active)}
                    disabled={promoActionCode === promo.code}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                  >
                    {promo.active ? "Отключить" : "Включить"}
                  </button>
                  <button
                    onClick={() => {
                      setPromoForm({
                        code: promo.code,
                        type: promo.type,
                        value: String(promo.value),
                        maxUses: promo.maxUses ? String(promo.maxUses) : "",
                        expiresAtLocal: toLocalDateTimeInput(promo.expiresAt),
                        active: promo.active,
                      });
                    }}
                    disabled={promoActionCode === promo.code}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => removePromo(promo.code)}
                    disabled={promoActionCode === promo.code}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-neutral-600">
              Промокоды пока не созданы.
            </div>
          )}
        </div>
      </section>

      {ordersErr ? (
        <div className="mt-6 rounded-2xl border bg-white/60 p-4 text-sm text-red-600">{ordersErr}</div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-3xl border bg-white/60 shadow-sm backdrop-blur">
        <div className="grid grid-cols-[140px_160px_1fr_140px_120px] gap-3 border-b px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">
          <div>Заказ</div>
          <div>Дата</div>
          <div>Клиент</div>
          <div className="text-right">Сумма</div>
          <div>Статус</div>
        </div>

        {ordersLoading ? (
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
                  <div className="truncate font-medium">{o.customer?.name || "—"}</div>
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

                <div className="text-neutral-700">{statusLabel(o.status)}</div>
              </a>
            );
          })
        ) : (
          <div className="px-5 py-8 text-sm text-neutral-600">Пока нет заказов.</div>
        )}
      </div>
    </main>
  );
}
