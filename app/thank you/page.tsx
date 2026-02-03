import Link from "next/link";

type Props = {
  searchParams: {
    orderId?: string;
  };
};

export default function ThankYouPage({ searchParams }: Props) {
  const orderId = searchParams.orderId;

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-semibold">
        Спасибо за заказ 🤍
      </h1>

      {orderId ? (
        <p className="mt-4 text-sm opacity-70">
          Номер заказа: <b>{orderId}</b>
        </p>
      ) : (
        <p className="mt-4 text-sm text-red-600">
          Не удалось определить номер заказа
        </p>
      )}

      <p className="mt-6 text-sm">
        Мы получили ваш заказ и свяжемся с вами для подтверждения.
      </p>

      <Link
        href="/"
        className="inline-block mt-8 underline text-sm"
      >
        Вернуться на главную
      </Link>
    </div>
  );
}