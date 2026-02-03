import Link from "next/link";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function OrderPage({ searchParams }: Props) {
  const sp = searchParams ?? {};
  const raw = sp.orderId;
  const orderId = Array.isArray(raw) ? raw[0] : raw;

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-semibold">Заказ создан ✅</h1>

      {orderId ? (
        <p className="mt-4 text-sm opacity-70">
          Номер заказа: <b>{orderId}</b>
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-red-600">orderId не передан</p>
          <pre className="mt-3 text-xs border rounded-xl p-3 text-left whitespace-pre-wrap opacity-80">
            {JSON.stringify({ searchParams }, null, 2)}
          </pre>
        </>
      )}

      <p className="mt-6 text-sm">
        Мы получили ваш заказ. Скоро подключим оплату ЮKassa и уведомления.
      </p>

      <Link href="/" className="inline-block mt-8 underline text-sm">
        На главную
      </Link>
    </div>
  );
}