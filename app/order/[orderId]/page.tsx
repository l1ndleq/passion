import Link from "next/link";

export default function OrderPage({
  params,
}: {
  params: { orderId?: string };
}) {
  const orderId = params?.orderId ?? "";

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-semibold">Заказ создан ✅</h1>

      <p className="mt-4 text-sm opacity-70">
        Номер заказа: <b>{orderId || "—"}</b>
      </p>

      {/* Диагностика на всякий случай: покажет, что реально приходит */}
      <pre className="mt-4 text-xs border rounded-xl p-3 text-left whitespace-pre-wrap opacity-70">
        {JSON.stringify({ params }, null, 2)}
      </pre>

      <p className="mt-6 text-sm">
        Мы получили ваш заказ. Скоро подключим оплату ЮKassa и уведомления.
      </p>

      <Link href="/" className="inline-block mt-8 underline text-sm">
        На главную
      </Link>
    </div>
  );
}