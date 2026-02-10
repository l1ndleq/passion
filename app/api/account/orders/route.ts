import { NextResponse } from "next/server";
import { getUserOrderIds, getOrdersByIds } from "@/app/lib/orders";
import { getSessionFromRequest } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session?.phone) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const ids = await getUserOrderIds(session.phone, 50);
    const ordersRaw = await getOrdersByIds(ids);

    const orders = (ordersRaw || []).filter(Boolean);
    orders.sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));

    const res = NextResponse.json({ ok: true, count: orders.length, orders });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    return NextResponse.json({ ok: false, error: "ORDERS_FAILED" }, { status: 500 });
  }
}
