import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookieHeader } from "@/app/lib/auth";
import AccountClient from "./page.client";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const h = await headers();
  const cookieHeader = h.get("cookie") || "";
  const session = getSessionFromCookieHeader(cookieHeader);

  if (!session) redirect("/login");

  return (
    <Suspense fallback={<div className="p-6 text-sm text-black/60">Загрузка…</div>}>
      <AccountClient phone={session.phone} />
    </Suspense>
  );
}
