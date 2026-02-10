import { Suspense } from "react";
import MyOrdersClient from "./page.client";

export const dynamic = "force-dynamic";

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Загрузка…</div>}>
      <MyOrdersClient />
    </Suspense>
  );
}
