// app/admin/orders/[orderId]/page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import OrderAdminClient from "./page.client";

export default function AdminOrderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderAdminClient />
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
