import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/app/lib/auth";
import AccountClient from "./page.client";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function readCookie(name: string) {
  const h = await headers();
  const cookie = h.get("cookie") || "";

  const parts = cookie.split(";").map((p) => p.trim());
  const found = parts.find((p) => p.startsWith(name + "="));
  if (!found) return null;

  return decodeURIComponent(found.slice(name.length + 1));
}

export default async function AccountPage() {
  const token = await readCookie(SESSION_COOKIE_NAME);
  const session = verifySessionToken(token);

  if (!session) redirect("/login");

  return (
    <Suspense fallback={<div className="p-6 text-sm text-black/60">Загрузка…</div>}>
      <AccountClient />
    </Suspense>
  );
}
