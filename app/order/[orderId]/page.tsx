export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Заказ создан ✅</h1>

      <p className="mt-4 text-sm opacity-70">Номер заказа:</p>
      <p className="mt-1 font-mono text-lg">{orderId}</p>

      <p className="mt-6">
        Мы получили ваш заказ. Скоро подключим оплату ЮKassa и уведомления.
      </p>
    </main>
  );
}