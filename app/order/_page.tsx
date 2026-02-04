"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

export const dynamic = "force-dynamic";

function OrderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const orderId = useMemo(() => {
    // 1) если вдруг окажемся на /order?orderId=...
    const q = searchParams.get("orderId");
    if (q) return q;

    // 2) если мы на /order/<id>
    const parts = (pathname || "").split("/").filter(Boolean);
    const idx = parts.indexOf("order");
    return idx !== -1 ? parts[idx + 1] || "" : "";
  }, [pathname, searchParams]);

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

export default function OrderFallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-xl mx-auto text-center">
          <h1 className="text-2xl font-semibold">Заказ создан ✅</h1>
          <p className="mt-4 text-sm opacity-70">Загружаем номер заказа…</p>
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}