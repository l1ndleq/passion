"use client";

export default function OrderClient({ orderId }: { orderId: string }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold">Заказ создан ✅</h1>

      <p className="mt-4 text-sm opacity-70">Номер заказа:</p>
      <p className="mt-1 font-mono text-lg">{orderId}</p>

      <p className="mt-6">
        Мы получили ваш заказ. Скоро подключим оплату ЮKassa и уведомления.
      </p>
    </div>
  );
}