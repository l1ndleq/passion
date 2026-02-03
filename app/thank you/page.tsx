import Link from "next/link";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const orderId = searchParams?.orderId;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
        PASSION / THANK YOU
      </div>
      <h1 className="mt-3 text-3xl leading-tight">Спасибо за заказ!</h1>

      <p className="mt-3 text-sm opacity-70">
        {orderId ? (
          <>
            Мы получили оплату и уже обрабатываем заказ <b>{orderId}</b>.
          </>
        ) : (
          <>Мы получили оплату и уже обрабатываем заказ.</>
        )}
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/products" className="px-4 py-2 rounded-full bg-black text-white text-sm">
          Вернуться к продуктам
        </Link>
        <Link href="/cart" className="px-4 py-2 rounded-full border text-sm">
          Корзина
        </Link>
      </div>

      <p className="mt-6 text-xs opacity-60">
        Если Telegram не пришёл — не страшно: это влияет только на уведомление менеджера, ваш заказ уже сохранён.
      </p>
    </div>
  );
}