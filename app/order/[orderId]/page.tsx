import Link from "next/link";

// app/order/[orderId]/page.tsx
export const dynamic = "force-dynamic";

import OrderClient from "./OrderClient";

export default function OrderPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <OrderClient orderId={params.orderId} />;
(
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-semibold">Заказ создан ✅</h1>

      <p className="mt-4 text-sm opacity-70">
        Номер заказа: <b>{params.orderId}</b>
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