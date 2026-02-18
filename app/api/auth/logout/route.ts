import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/app/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookie());
  return res;
}
