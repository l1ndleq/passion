"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error === "INVALID_PASSWORD" ? "Неверный пароль" : "Ошибка входа");
        return;
      }

      router.replace("/admin/orders");
    } catch {
      setError("Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border bg-white/60 backdrop-blur p-8 shadow-sm">
        <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
          PASSION / ADMIN
        </div>

        <h1 className="mt-3 text-2xl font-medium tracking-tight">Вход в админку</h1>
        <p className="mt-1 text-sm text-neutral-600">Введите пароль администратора.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
          />

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-black px-5 py-3 text-sm text-white hover:opacity-90 disabled:opacity-60"
            type="submit"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}
