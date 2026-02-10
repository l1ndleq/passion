import { Suspense } from "react";
import LoginClient from "./page.client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-black/60">Загрузка…</div>}>
      <LoginClient />
    </Suspense>
  );
}
