"use client";

export const dynamic = "force-dynamic";


import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";


export default function AdminLoginPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const nextPath = useMemo(() => sp.get("next") || "/admin/orders", [sp]);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, next: nextPath }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setError("Неверный логин или пароль");
        setPending(false);
        return;
      }

      router.replace(j.next || nextPath);
      router.refresh();
    } catch {
      setError("Ошибка сети");
      setPending(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-5 py-14">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.22em] text-black/55">Admin</div>
          <h1 className="mt-2 text-2xl font-semibold">Вход</h1>
          <p className="mt-2 text-sm text-black/60">
            Введите логин и пароль администратора.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
            placeholder="Логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
          />
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            disabled={pending || !login || !password}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Входим..." : "Войти"}
          </button>
        </form>

        <div className="mt-4 text-xs text-black/50">
          После входа откроется: <span className="font-mono">{nextPath}</span>
        </div>
      </div>
    </main>
  );
}
