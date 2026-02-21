"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { sanitizeTelegramUsername } from "@/app/lib/xss";
import { Reveal } from "@/components/Reveal";

type Profile = { name: string; phone: string; email: string };

type OrderItem = { id?: string; title?: string; price?: number; qty?: number; image?: string };
type ServerOrder = {
  orderId: string;
  status?: string;
  createdAt?: number;
  totalPrice?: number;
  items?: OrderItem[];
  customer?: { name?: string; phone?: string; telegram?: string | null;[k: string]: any };
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
  if (status === "new") return "Новый";
  if (status === "processing") return "В обработке";
  if (status === "completed") return "Завершен";
  if (status === "cancelled") return "Отменен";
  if (status === "shipped") return "Отправлен";
  return status;
}

export default function AccountClient({ phone }: { phone: string }) {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", email: "" });

  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [tgLinked, setTgLinked] = useState<boolean | null>(null);
  const [tgUsername, setTgUsername] = useState<string | null>(null);
  const [tgDisplayName, setTgDisplayName] = useState<string | null>(null);
  const [tgError, setTgError] = useState<string | null>(null);
  const [tgUnlinkLoading, setTgUnlinkLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const [trackValue, setTrackValue] = useState("");

  const BOT_USERNAME = sanitizeTelegramUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "");
  const BOT_LINK = BOT_USERNAME
    ? `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent("bind_account")}`
    : "";

  useEffect(() => {
    const stored = safeJson<Partial<Profile>>(localStorage.getItem(PROFILE_KEY), {});
    const safeName = String(stored.name || "");
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: safeName }));
    setProfile(
      {
        name: safeName,
        phone: phone || "",
        email: "",
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadOrders() {
      try {
        setLoadingOrders(true);
        setOrdersError(null);

        const r = await fetch("/api/account/orders", { cache: "no-store" });
        const j = await r.json().catch(() => null);

        if (!alive) return;

        if (!r.ok || !j?.ok) {
          setOrdersError("Не удалось загрузить заказы");
          setOrders([]);
          return;
        }

        setOrders(Array.isArray(j.orders) ? j.orders : []);
      } catch {
        if (!alive) return;
        setOrdersError("Не удалось загрузить заказы");
        setOrders([]);
      } finally {
        if (!alive) return;
        setLoadingOrders(false);
      }
    }

    async function loadTgStatus() {
      try {
        setTgError(null);
        const r = await fetch("/api/account/telegram-status", { cache: "no-store" });
        const j = await r.json().catch(() => null);
        if (!alive) return;

        if (!r.ok || !j?.ok) {
          setTgLinked(null);
          setTgUsername(null);
          setTgDisplayName(null);
          setTgError("Не удалось проверить привязку Телеграма");
          return;
        }

        setTgLinked(Boolean(j.linked));
        setTgUsername(
          typeof j.username === "string" && j.username.trim()
            ? sanitizeTelegramUsername(j.username)
            : null
        );
        setTgDisplayName(
          typeof j.displayName === "string" && j.displayName.trim()
            ? j.displayName.trim()
            : null
        );
      } catch {
        if (!alive) return;
        setTgLinked(null);
        setTgUsername(null);
        setTgDisplayName(null);
        setTgError("Не удалось проверить привязку Телеграма");
      }
    }

    loadOrders();
    loadTgStatus();

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
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: next.name }));
  }

  function normalizeOrderId(v: string) {
    return v.trim().replace(/\s+/g, "").toUpperCase();
  }

  const normalized = normalizeOrderId(trackValue);
  const canTrack = normalized.length >= 6;

  async function logout() {
    if (logoutLoading) return;

    setLogoutLoading(true);
    setLogoutError(null);

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setLogoutError("Не удалось выйти из аккаунта");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setLogoutError("Не удалось выйти из аккаунта");
    } finally {
      setLogoutLoading(false);
    }
  }

  async function unlinkTelegram() {
    if (tgUnlinkLoading) return;

    setTgUnlinkLoading(true);
    setTgError(null);

    try {
      const res = await fetch("/api/account/telegram-status", {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setTgError("Не удалось отвязать Телеграм");
        return;
      }

      setTgLinked(false);
      setTgUsername(null);
      setTgDisplayName(null);
    } catch {
      setTgError("Не удалось отвязать Телеграм");
    } finally {
      setTgUnlinkLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Reveal>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-black/60">Личный кабинет</div>
            <div className="text-2xl font-semibold">Мой аккаунт</div>
            <div className="mt-1 text-xs text-black/50">Вы вошли как: {phone}</div>
          </div>
          <button
            onClick={logout}
            disabled={logoutLoading}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-white/70 disabled:opacity-50"
            type="button"
          >
            {logoutLoading ? "Выходим..." : "Выйти"}
          </button>
        </div>
        {logoutError ? <div className="text-xs text-red-600">{logoutError}</div> : null}
      </Reveal>

      {/* Профиль */}
      <Reveal delay={0.1}>
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
                label="Эл. почта"
                value={profile.email}
                onChange={(v) => saveProfile({ ...profile, email: v })}
                placeholder="почта@пример.рф"
              />
            </div>

            <div className="mt-3 text-xs text-black/50">
              В этом браузере сохраняется только имя. Заказы - на сервере.
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
              className={`mt-3 inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm hover:bg-white/70 ${!canTrack ? "opacity-50 pointer-events-none" : ""
                }`}
            >
              Открыть
            </Link>

            <div className="mt-2 text-[11px] text-black/50">
              Номер заказа есть в Телеграме/после оформления.
            </div>
          </div>
        </div>
      </Reveal>

      {/* Телеграм */}
      <Reveal delay={0.2}>
        <div className="border border-black/10 rounded-2xl bg-white/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">Телеграм</div>
            <button
              onClick={() => window.location.reload()}
              disabled={tgUnlinkLoading}
              className="text-xs text-black/50 hover:text-black transition disabled:opacity-50"
              type="button"
            >
              Обновить
            </button>
          </div>

          {tgError ? (
            <div className="mt-3 text-sm text-red-600">Ошибка проверки: {tgError}</div>
          ) : tgLinked === null ? (
            <div className="mt-3 text-sm text-black/50">Проверяем…</div>
          ) : tgLinked ? (
            <div className="mt-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-800">
                <TelegramLogoIcon className="h-4 w-4" />
                <span className="font-medium leading-none">
                  {tgUsername ? `@${tgUsername}` : tgDisplayName || "Telegram подключен"}
                </span>
              </span>
              <div className="mt-2 text-xs text-black/50">
                Уведомления о заказах будут приходить в Телеграм для этого номера.
              </div>
              <button
                onClick={unlinkTelegram}
                disabled={tgUnlinkLoading}
                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
                type="button"
              >
                {tgUnlinkLoading ? "Отвязываем..." : "Отвязать Telegram"}
              </button>
            </div>
          ) : (
            <div className="mt-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1">
                Не привязан
              </span>

              <div className="mt-2 text-xs text-black/50">
                Привяжи Телеграм — и уведомления о заказах будут приходить туда автоматически.
              </div>

              {BOT_USERNAME ? (
                <a
                  className="tg-btn mt-3 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                  href={BOT_LINK}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="tg-btn__icon" aria-hidden="true">
                    <TelegramLogoIcon className="h-4 w-4" />
                  </span>
                  <span className="leading-none">Открыть бота и привязать</span>
                </a>
              ) : (
                <div className="mt-3 text-xs text-black/50">
                  Добавьте переменную окружения{" "}
                  <code className="px-1 py-0.5 rounded bg-black/5">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>{" "}
                  (без @), чтобы показать кнопку.
                </div>
              )}
            </div>
          )}
        </div>
      </Reveal>

      {/* Заказы */}
      <Reveal delay={0.3}>
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
                        href={`/order/${encodeURIComponent(String(o.orderId || ""))}`}
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
      </Reveal>

      <div className="text-xs text-black/45">
        Если заказа нет в списке — проверь, что оформление делалось под этим номером телефона.
      </div>
    </div>
  );
}

function TelegramLogoIcon({ className = "h-5 w-5" }: { className?: string }) {
  const iconClassName = `${className} block shrink-0`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClassName}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        fill="#FFFFFF"
        d="M17.34 7.31 6.12 11.64c-.77.31-.76.74-.14.93l2.88.9 1.11 3.44c.13.36.07.51.45.51.29 0 .42-.13.58-.28l1.39-1.35 2.89 2.13c.53.29.91.14 1.04-.5l1.9-8.96c.2-.78-.3-1.13-.88-.88Zm-1.66 1.58-4.93 4.45-.19 2.1-.87-2.73 5.99-3.82Z"
      />
    </svg>
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
