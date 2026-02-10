import { Suspense } from "react";
import OrderClient from "./OrderClient";

export const dynamic = "force-dynamic";

export default function OrderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-neutral-500">
      Загружаем заказ…
    </div>
  );
}
