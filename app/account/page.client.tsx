"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Profile = { name: string; phone: string; email: string };

type OrderItem = { id?: string; title?: string; price?: number; qty?: number; image?: string };
type ServerOrder = {
  orderId: string;
  status?: string;
  createdAt?: number;
  totalPrice?: number;
  items?: OrderItem[];
  customer?: { name?: string; phone?: string; telegram?: string | null; [k: string]: any };
};

const PROFILE_KEY = "passion_profile";

function safeJson<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatMoney(n: number) {
  try {
    return n.toLocaleString("ru-RU");
  } catch {
    return String(n);
  }
}

function statusLabel(status?: string) {
  if (!status) return "—";
  if (status === "paid") return "Оплачено ✅";
  if (status === "pending_payment") return "Не оплачено ⏳";
  return status;
}

export default function AccountClient({ phone }: { phone: string }) {
  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", email: "" });

  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [trackValue, setTrackValue] = useState("");

  useEffect(() => {
    setProfile(
      safeJson<Profile>(localStorage.getItem(PROFILE_KEY), {
        name: "",
        phone: phone || "",
        email: "",
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoadingOrders(true);
        setOrdersError(null);

        const r = await fetch("/api/account/orders", { cache: "no-store" });
        const j = await r.json().catch(() => null);

        if (!alive) return;

        if (!r.ok || !j?.ok) {
          setOrdersError(j?.error || "ORDERS_FAILED");
          setOrders([]);
          return;
        }

        setOrders(Array.isArray(j.orders) ? j.orders : []);
      } catch {
        if (!alive) return;
        setOrdersError("ORDERS_FAILED");
        setOrders([]);
      } finally {
        if (!alive) return;
        setLoadingOrders(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const sorted = useMemo(
    () => [...orders].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 50),
    [orders]
  );

  function saveProfile(next: Profile) {
    setProfile(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }

  function normalizeOrderId(v: string) {
    return v.trim().replace(/\s+/g, "").toUpperCase();
  }

  const normalized = normalizeOrderId(trackValue);
  const canTrack = normalized.length >= 6;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <div className="text-sm text-black/60">Личный кабинет</div>
        <div className="text-2xl font-semibold">Мой аккаунт</div>
        <div className="mt-1 text-xs text-black/50">Вы вошли как: {phone}</div>
      </div>

      {/* Профиль */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-black/10 rounded-2xl bg-white/40 p-4">
          <div className="font-medium mb-3">Профиль</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field
              label="Имя"
              value={profile.name}
              onChange={(v) => saveProfile({ ...profile, name: v })}
              placeholder="Олег"
            />
            <Field
              label="Телефон"
              value={profile.phone}
              onChange={(v) => saveProfile({ ...profile, phone: v })}
              placeholder="+7..."
            />
            <Field
              label="Email"
              value={profile.email}
              onChange={(v) => saveProfile({ ...profile, email: v })}
              placeholder="name@email.com"
            />
          </div>

          <div className="mt-3 text-xs text-black/50">
            Профиль сохраняется в этом браузере (localStorage). Заказы — на сервере.
          </div>
        </div>

        {/* Быстрое отслеживание */}
        <div className="border border-black/10 rounded-2xl bg-white/40 p-4">
          <div className="font-medium mb-3">Отследить заказ</div>

          <input
            value={trackValue}
            onChange={(e) => setTrackValue(e.target.value)}
            placeholder="Напр. P-MLGLJ641"
            className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm bg-white/60 outline-none focus:ring-2 focus:ring-black/10"
          />

          <Link
            href={canTrack ? `/order/${normalized}` : "#"}
            onClick={(e) => {
              if (!canTrack) e.preventDefault();
            }}
            className={`mt-3 inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm hover:bg-white/70 ${
              !canTrack ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            Открыть
          </Link>

          <div className="mt-2 text-[11px] text-black/50">
            Номер заказа есть в Telegram/после оформления.
          </div>
        </div>
      </div>

      {/* Заказы */}
      <div className="border border-black/10 rounded-2xl bg-white/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Мои заказы</div>

          <button
            onClick={() => window.location.reload()}
            className="text-xs text-black/50 hover:text-black transition"
            type="button"
          >
            Обновить
          </button>
        </div>

        {loadingOrders ? (
          <div className="mt-3 text-sm text-black/50">Загрузка заказов…</div>
        ) : ordersError ? (
          <div className="mt-3 text-sm text-red-600">
            Не удалось загрузить заказы: {ordersError}
          </div>
        ) : sorted.length === 0 ? (
          <div className="mt-3 text-sm text-black/50">
            Пока пусто. Оформи заказ — и он появится здесь.
          </div>
        ) : (
          <div className="mt-3 divide-y divide-black/10 border border-black/10 rounded-xl overflow-hidden bg-white/30">
            {sorted.map((o) => {
              const items = Array.isArray(o.items) ? o.items : [];
              const shownCount = Math.min(items.length, 3);

              return (
                <div
                  key={o.orderId}
                  className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <div className="text-xs text-black/50">Заказ</div>
                    <div className="font-medium">#{o.orderId}</div>

                    <div className="mt-1 text-xs text-black/55">
                      <span className="mr-2">{statusLabel(o.status)}</span>
                      {typeof o.totalPrice === "number" && (
                        <span className="mr-2">• {formatMoney(o.totalPrice)} ₽</span>
                      )}
                      {o.createdAt ? (
                        <span>• {new Date(o.createdAt).toLocaleString()}</span>
                      ) : null}
                    </div>

                    {items.length > 0 && (
                      <div className="mt-2 text-xs text-black/55">
                        {items.slice(0, shownCount).map((it, idx) => {
                          const title = String(it.title ?? it.id ?? "Товар");
                          const qty = Number(it.qty ?? 1);
                          return (
                            <span key={idx}>
                              {title} × {qty}
                              {idx < shownCount - 1 ? " • " : ""}
                            </span>
                          );
                        })}
                        {items.length > 3 ? <span> • …</span> : null}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/order/${o.orderId}`}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-white/70"
                    >
                      Открыть
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-black/45">
        Если заказа нет в списке — проверь, что оформление делалось под этим номером телефона.
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-black/50 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm bg-white/60 outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}
