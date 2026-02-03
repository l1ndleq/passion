"use client";

import { useState } from "react";

export default function CheckoutClient({ items, totalPrice }: { items: any[]; totalPrice: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          totalPrice,
          customer: {}, // сюда подставишь данные из формы
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.paymentUrl) {
        throw new Error(data?.error || "Не удалось создать оплату");
      }

      window.location.href = data.paymentUrl;
    } catch (err: any) {
      setError(err?.message || "Ошибка оплаты");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {/* твои инпуты остаются тут */}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Загрузка..." : "Перейти к оплате"}
      </button>
    </form>
  );
}