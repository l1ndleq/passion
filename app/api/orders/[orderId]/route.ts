import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

export async function GET(req: Request) {
  try {
    const pathname = new URL(req.url).pathname; // /api/orders/P-XXXX
    const parts = pathname.split("/").filter(Boolean);
    const orderId = (parts[parts.length - 1] || "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    }

    const key = `order:${orderId}`;
    const order: any = await redis.get(key);

    if (!order) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    // ✅ Санитизация: только то, что можно показывать клиенту
    const safeOrder = {
      orderId: order.orderId ?? orderId,
      status: order.status ?? "new",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      totalPrice: order.totalPrice ?? order.total,
      items: Array.isArray(order.items)
        ? order.items.map((it: any) => ({
            title: String(it.title ?? it.name ?? "Item"),
            qty: Number(it.qty ?? it.quantity ?? 1),
            price: Number(it.price ?? 0),
          }))
        : [],
    };

    return NextResponse.json({ ok: true, order: safeOrder });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ORDER_PUBLIC_GET_FAILED" },
      { status: 500 }
    );
  }
}
