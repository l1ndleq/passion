import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { getSessionFromRequest } from "@/app/lib/auth";
import {
  ORDER_ACCESS_QUERY_PARAM,
  verifyOrderAccessToken,
} from "@/app/lib/orderAccess";

export const runtime = "nodejs";

type StoredOrderItem = {
  title?: unknown;
  name?: unknown;
  qty?: unknown;
  quantity?: unknown;
  price?: unknown;
};

type StoredOrder = {
  orderId?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  totalPrice?: unknown;
  total?: unknown;
  customer?: { phone?: unknown } | null;
  items?: unknown;
};

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const orderId = (parts[parts.length - 1] || "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    }

    const order = await redis.get<StoredOrder>(`order:${orderId}`);
    if (!order) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const orderPhone = String(order?.customer?.phone || "");
    const orderPhoneDigits = phoneDigits(orderPhone);

    const session = getSessionFromRequest(req);
    const sessionPhoneDigits = phoneDigits(session?.phone || "");
    const isOwner =
      Boolean(session?.phone) &&
      Boolean(orderPhoneDigits) &&
      sessionPhoneDigits === orderPhoneDigits;

    const token =
      req.headers.get("x-order-access-token") ||
      url.searchParams.get(ORDER_ACCESS_QUERY_PARAM);
    const hasAccessToken = verifyOrderAccessToken({ orderId, phone: orderPhone, token });

    if (!isOwner && !hasAccessToken) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const itemsRaw = Array.isArray(order.items) ? order.items : [];
    const safeOrder = {
      orderId: String(order.orderId ?? orderId),
      status: String(order.status ?? "new"),
      createdAt: asNumber(order.createdAt),
      updatedAt: asNumber(order.updatedAt),
      totalPrice: asNumber(order.totalPrice ?? order.total),
      items: itemsRaw.map((it) => {
        const item = (it || {}) as StoredOrderItem;
        const qty = asNumber(item.qty ?? item.quantity) ?? 1;
        const price = asNumber(item.price) ?? 0;
        return {
          title: String(item.title ?? item.name ?? "Item"),
          qty,
          price,
        };
      }),
    };

    return NextResponse.json({ ok: true, order: safeOrder });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "ORDER_PUBLIC_GET_FAILED";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
