import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  WAITLIST_INDEX_KEY,
  waitlistEntryKey,
  waitlistStatKey,
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

function getRedisOrNull() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export async function GET() {
  try {
    const redis = getRedisOrNull();
    if (!redis) {
      return NextResponse.json({
        ok: true,
        degraded: true,
        stats: {
          clicksTotal: 0,
          clicksHome: 0,
          clicksCatalog: 0,
          submitsTotal: 0,
          submitsHome: 0,
          submitsCatalog: 0,
          submitsTelegram: 0,
          submitsEmail: 0,
          uniqueTotal: 0,
          uniqueTelegram: 0,
          uniqueEmail: 0,
        },
        entries: [],
      });
    }

    const statFields = [
      "clicks_total",
      "clicks_home",
      "clicks_catalog",
      "submits_total",
      "submits_home",
      "submits_catalog",
      "submits_telegram",
      "submits_email",
      "unique_total",
      "unique_telegram",
      "unique_email",
    ] as const;

    const [statsRaw, idsRaw] = await Promise.all([
      redis.mget(...statFields.map((field) => waitlistStatKey(field))),
      redis.smembers<string[]>(WAITLIST_INDEX_KEY),
    ]);

    const statValues = Array.isArray(statsRaw) ? statsRaw : [];
    const statsObj = Object.fromEntries(
      statFields.map((field, index) => [field, toNumber(statValues[index])])
    );
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
        clicksTotal: statsObj.clicks_total,
        clicksHome: statsObj.clicks_home,
        clicksCatalog: statsObj.clicks_catalog,
        submitsTotal: statsObj.submits_total,
        submitsHome: statsObj.submits_home,
        submitsCatalog: statsObj.submits_catalog,
        submitsTelegram: statsObj.submits_telegram,
        submitsEmail: statsObj.submits_email,
        uniqueTotal: statsObj.unique_total,
        uniqueTelegram: statsObj.unique_telegram,
        uniqueEmail: statsObj.unique_email,
      },
      entries: entries.slice(0, 100),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "WAITLIST_STATS_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
