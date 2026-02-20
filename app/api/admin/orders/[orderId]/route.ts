import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { OrderIdSchema } from "@/app/lib/inputValidation";

export async function GET(req: Request) {
  try {
    // надёжно достаём orderId из URL
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    const parsedOrderId = OrderIdSchema.safeParse(parts[parts.length - 1] || "");

    if (!parsedOrderId.success) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ID_REQUIRED" },
        { status: 400 }
      );
    }
    const orderId = parsedOrderId.data;

    // ⬇️ КЛЮЧ В REDIS
    const order = await redis.get(`order:${orderId}`);

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ORDER_GET_FAILED" },
      { status: 500 }
    );
  }
}
