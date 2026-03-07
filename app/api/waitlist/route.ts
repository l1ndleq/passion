import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import {
  WAITLIST_INDEX_KEY,
  WAITLIST_STATS_KEY,
  parseWaitlistChannel,
  parseWaitlistSource,
  normalizeWaitlistEmail,
  normalizeWaitlistTelegram,
  waitlistEntryKey,
} from "@/app/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WaitlistEntry = {
  channel: "telegram" | "email";
  contact: string;
  createdAt: number;
  updatedAt: number;
  firstSource: "home" | "catalog";
  lastSource: "home" | "catalog";
};

async function incStat(field: string) {
  await redis.hincrby(WAITLIST_STATS_KEY, field, 1);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "subscribe").trim().toLowerCase();
    const source = parseWaitlistSource(body?.source);

    if (!source) {
      return NextResponse.json({ ok: false, error: "SOURCE_INVALID" }, { status: 400 });
    }

    if (action === "click") {
      await Promise.all([incStat("clicks_total"), incStat(`clicks_${source}`)]);
      return NextResponse.json({ ok: true });
    }

    if (action !== "subscribe") {
      return NextResponse.json({ ok: false, error: "ACTION_INVALID" }, { status: 400 });
    }

    const channel = parseWaitlistChannel(body?.channel);
    if (!channel) {
      return NextResponse.json({ ok: false, error: "CHANNEL_INVALID" }, { status: 400 });
    }

    const contact =
      channel === "email"
        ? normalizeWaitlistEmail(body?.contact)
        : normalizeWaitlistTelegram(body?.contact);

    if (!contact) {
      return NextResponse.json({ ok: false, error: "CONTACT_INVALID" }, { status: 400 });
    }

    const entryId = `${channel}:${contact}`;
    const key = waitlistEntryKey(entryId);
    const now = Date.now();
    const existing = await redis.get<WaitlistEntry>(key);

    const next: WaitlistEntry = {
      channel,
      contact,
      createdAt:
        existing && Number.isFinite(Number(existing.createdAt))
          ? Math.floor(Number(existing.createdAt))
          : now,
      updatedAt: now,
      firstSource: existing?.firstSource === "catalog" ? "catalog" : source,
      lastSource: source,
    };

    await redis.set(key, next);
    await redis.sadd(WAITLIST_INDEX_KEY, entryId);

    const statOps = [
      incStat("submits_total"),
      incStat(`submits_${source}`),
      incStat(`submits_${channel}`),
    ];

    if (!existing) {
      statOps.push(incStat("unique_total"), incStat(`unique_${channel}`));
    }

    await Promise.all(statOps);

    return NextResponse.json({ ok: true, alreadySubscribed: Boolean(existing) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "WAITLIST_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
