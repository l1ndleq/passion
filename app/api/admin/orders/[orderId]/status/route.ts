import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { OrderIdSchema, OrderStatusSchema } from "@/app/lib/inputValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StatusEntry = {
  status: string;
  at: number;
  by: "admin";
};

export async function POST(req: Request) {
  try {
    const pathname = new URL(req.url).pathname; // /api/admin/orders/P-XXX/status
    const parts = pathname.split("/").filter(Boolean);
    const parsedOrderId = OrderIdSchema.safeParse(parts[parts.length - 2] || "");

    if (!parsedOrderId.success) {
      return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    }
    const orderId = parsedOrderId.data;

    const body = await req.json().catch(() => ({}));
    const parsedStatus = OrderStatusSchema.safeParse(body?.status ?? "");

    if (!parsedStatus.success) {
      return NextResponse.json({ ok: false, error: "STATUS_REQUIRED" }, { status: 400 });
    }
    const status = parsedStatus.data;

    const key = `order:${orderId}`;
    const order = await redis.get<any>(key);

    if (!order) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const prevStatus = String(order.status || "");
    if (prevStatus === status) {
      return NextResponse.json({ ok: true, order });
    }

    const history: StatusEntry[] = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    const updated = {
      ...order,
      status,
      updatedAt: Date.now(),
      statusHistory: [
        ...history,
        {
          status,
          at: Date.now(),
          by: "admin" as const,
        },
      ],
    };

    await redis.set(key, updated);

    // ✅ уведомление через единый endpoint
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    if (site) {
      await fetch(`${site}/api/account/orders/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.ADMIN_SECRET || "",
        },
        body: JSON.stringify({ orderId, status }),
      }).catch((e) => console.error("Notify endpoint failed:", e));
    } else {
      console.error("NEXT_PUBLIC_SITE_URL missing: cannot notify");
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "STATUS_UPDATE_FAILED" },
      { status: 500 }
    );
  }
}
