export const dynamic = "force-dynamic";

import OrderClient from "./OrderClient";

export default function OrderPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <OrderClient orderId={params.orderId} />;
}