import { NextResponse } from "next/server";
import { getUserOrderIds, getOrdersByIds } from "@/app/lib/orders";
import { getSessionFromRequest } from "@/app/lib/auth";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session?.phone) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const ids = await getUserOrderIds(session.phone, 50);
    const orders = await getOrdersByIds(ids);

    orders.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));

    return NextResponse.json({ ok: true, orders });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "ORDERS_FAILED" }, { status: 500 });
  }
}
