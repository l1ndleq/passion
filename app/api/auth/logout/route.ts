import { NextResponse } from "next/server";
import { clearSessionCookie, sessionCookieNames } from "@/app/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const name of sessionCookieNames()) {
    res.cookies.set(clearSessionCookie(name));
  }
  return res;
}
