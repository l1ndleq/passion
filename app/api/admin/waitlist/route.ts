import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import {
  WAITLIST_INDEX_KEY,
  WAITLIST_STATS_KEY,
  waitlistEntryKey,
  type WaitlistChannel,
  type WaitlistSource,
} from "@/app/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WaitlistEntry = {
  channel: WaitlistChannel;
  contact: string;
  createdAt: number;
  updatedAt: number;
  firstSource: WaitlistSource;
  lastSource: WaitlistSource;
};

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export async function GET() {
  try {
    const [statsRaw, idsRaw] = await Promise.all([
      redis.hgetall<Record<string, number | string>>(WAITLIST_STATS_KEY),
      redis.smembers<string[]>(WAITLIST_INDEX_KEY),
    ]);

    const statsObj = statsRaw && typeof statsRaw === "object" ? statsRaw : {};
    const ids = (Array.isArray(idsRaw) ? idsRaw : []).filter(Boolean);

    const rowsRaw = ids.length ? await redis.mget(...ids.map((id) => waitlistEntryKey(id))) : [];
    const entries = (Array.isArray(rowsRaw) ? rowsRaw : [])
      .filter(Boolean)
      .map((row) => row as WaitlistEntry)
      .filter((row) => row && (row.channel === "email" || row.channel === "telegram") && row.contact)
      .sort((a, b) => toNumber(b.updatedAt) - toNumber(a.updatedAt));

    return NextResponse.json({
      ok: true,
      stats: {
        clicksTotal: toNumber(statsObj.clicks_total),
        clicksHome: toNumber(statsObj.clicks_home),
        clicksCatalog: toNumber(statsObj.clicks_catalog),
        submitsTotal: toNumber(statsObj.submits_total),
        submitsHome: toNumber(statsObj.submits_home),
        submitsCatalog: toNumber(statsObj.submits_catalog),
        submitsTelegram: toNumber(statsObj.submits_telegram),
        submitsEmail: toNumber(statsObj.submits_email),
        uniqueTotal: toNumber(statsObj.unique_total),
        uniqueTelegram: toNumber(statsObj.unique_telegram),
        uniqueEmail: toNumber(statsObj.unique_email),
      },
      entries: entries.slice(0, 100),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "WAITLIST_STATS_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
