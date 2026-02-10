"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SavedOrder = { orderId: string; savedAt: number };
type Profile = { name: string; phone: string; email: string };

const PROFILE_KEY = "passion_profile";
const ORDERS_KEY = "passion_orders";

function safeJson<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function AccountClient() {
  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", email: "" });
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [trackValue, setTrackValue] = useState("");

  useEffect(() => {
    setProfile(safeJson<Profile>(localStorage.getItem(PROFILE_KEY), { name: "", phone: "", email: "" }));
    setOrders(safeJson<SavedOrder[]>(localStorage.getItem(ORDERS_KEY), []));
  }, []);

  const sorted = useMemo(
    () => [...orders].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0)).slice(0, 10),
    [orders]
  );

  function saveProfile(next: Profile) {
    setProfile(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }

  function clearOrders() {
    localStorage.removeItem(ORDERS_KEY);
    setOrders([]);
  }

  function copyLink(orderId: string) {
    const url = `${window.location.origin}/order/${orderId}`;
    navigator.clipboard.writeText(url).catch(() => {
      prompt("Скопируй ссылку:", url);
    });
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
            Данные сохраняются в этом браузере (localStorage).
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
          {sorted.length > 0 && (
            <button
              onClick={clearOrders}
              className="text-xs text-black/50 hover:text-black transition"
              type="button"
            >
              Очистить историю
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="mt-3 text-sm text-black/50">
            Пока пусто. После открытия страницы заказа он появится здесь.
          </div>
        ) : (
          <div className="mt-3 divide-y divide-black/10 border border-black/10 rounded-xl overflow-hidden bg-white/30">
            {sorted.map((x) => (
              <div key={x.orderId} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-black/50">Заказ</div>
                  <div className="font-medium">#{x.orderId}</div>
                  <div className="text-xs text-black/50">
                    Сохранён: {new Date(x.savedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(x.orderId)}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-white/70"
                    type="button"
                  >
                    Скопировать ссылку
                  </button>

                  <Link
                    href={`/order/${x.orderId}`}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-white/70"
                  >
                    Открыть
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-black/45">
        Дальше можно добавить “вход по телефону (OTP)” и хранить профиль/заказы уже на сервере.
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
