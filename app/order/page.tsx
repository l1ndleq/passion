"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export default function OrderPage() {
  const pathname = usePathname();

  // ожидаем /order/<orderId>
  const orderId = useMemo(() => {
    const parts = (pathname || "").split("/").filter(Boolean);
    const idx = parts.indexOf("order");
    if (idx === -1) return "";
    return parts[idx + 1] || "";
  }, [pathname]);

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-semibold">Заказ создан ✅</h1>

      <p className="mt-4 text-sm opacity-70">
        Номер заказа: <b>{orderId || "—"}</b>
      </p>

      <p className="mt-6 text-sm">
        Мы получили ваш заказ. Скоро подключим оплату ЮKassa и уведомления.
      </p>

      <Link href="/" className="inline-block mt-8 underline text-sm">
        На главную
      </Link>
    </div>
  );
}