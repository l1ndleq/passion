type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function OrderPage({ searchParams }: Props) {
  const orderId =
    typeof searchParams.orderId === "string"
      ? searchParams.orderId
      : undefined;

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-semibold">
        Заказ создан ✅
      </h1>

      {orderId ? (
        <p className="mt-4 text-sm opacity-70">
          Номер заказа: <b>{orderId}</b>
        </p>
      ) : (
        <p className="mt-4 text-sm text-red-600">
          orderId не передан
        </p>
      )}

      <p className="mt-6 text-sm">
        Мы получили ваш заказ. Скоро подключим оплату ЮKassa и уведомления.
      </p>
    </div>
  );
}