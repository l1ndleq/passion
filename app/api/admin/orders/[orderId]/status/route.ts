import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ✅ orderId из URL
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    const orderId = (parts[parts.length - 2] || "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const status = String(body?.status || "").trim();

    if (!status) {
      return NextResponse.json({ ok: false, error: "STATUS_REQUIRED" }, { status: 400 });
    }

    const key = `order:${orderId}`;
    const order = await redis.get<any>(key);

    if (!order) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const prevStatus = String(order.status || "");
    const updated = {
      ...order,
      status,
      updatedAt: Date.now(),
    };

    await redis.set(key, updated);

    // ✅ Если статус реально изменился — шлём уведомления через наш рабочий endpoint
    if (prevStatus !== status) {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
      const url = site ? `${site}/api/account/orders/status` : null;

      if (url) {
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": process.env.ADMIN_SECRET || "",
          },
          body: JSON.stringify({ orderId, status }),
        }).catch((e) => {
          console.error("Notify endpoint failed:", e);
        });
      } else {
        console.error("NEXT_PUBLIC_SITE_URL missing: cannot call notify endpoint");
      }
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "STATUS_UPDATE_FAILED" },
      { status: 500 }
    );
  }
}
