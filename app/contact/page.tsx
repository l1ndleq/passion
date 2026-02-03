"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget; // ✅ сохраняем ссылку на форму сразу

    setStatus("sending");
    setError("");

    const form = new FormData(formEl);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setStatus("error");
        setError(data?.error || "Не удалось отправить. Попробуй ещё раз.");
        return;
      }

      setStatus("success");
      formEl.reset(); // ✅ теперь не null
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Ошибка сети. Попробуй ещё раз.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <p className="text-xs uppercase tracking-[0.22em] text-black/55">
        passion / contact
      </p>

      <h1 className="mt-5 text-3xl md:text-5xl font-light tracking-[-0.03em]">
        Контакты
      </h1>

      <div className="mt-10 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <p className="text-black/70 leading-relaxed">
            Напиши нам — поможем подобрать уход или оформим заказ. Обычно отвечаем
            в течение дня.
          </p>

          <div className="mt-8 space-y-2 text-sm text-black/70">
            <a
              className="block hover:text-black transition"
              href="mailto:hello@passion.com"
            >
              hello@passion.com
            </a>
            <a className="block hover:text-black transition" href="#">
              Instagram
            </a>
            <a className="block hover:text-black transition" href="#">
              Telegram
            </a>
          </div>

          <div className="mt-10 rounded-[22px] border border-black/10 bg-white/35 p-6">
            <div className="text-xs uppercase tracking-[0.22em] text-black/55">
              Доставка
            </div>
            <p className="mt-3 text-sm text-black/70 leading-relaxed">
              Доставляем по городу и в другие регионы. В форме можно указать адрес
              — мы подтвердим стоимость и сроки.
            </p>
          </div>

          {status === "success" && (
            <div className="mt-6 rounded-[18px] border border-black/10 bg-white/35 p-4 text-sm text-black/75">
              Спасибо! Сообщение отправлено — мы скоро ответим.
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 rounded-[18px] border border-black/10 bg-white/35 p-4 text-sm text-black/75">
              Не получилось отправить:{" "}
              <span className="text-black/80">{error}</span>
            </div>
          )}
        </div>

        <div className="md:col-span-7">
          <form className="grid sm:grid-cols-2 gap-4" onSubmit={onSubmit}>
            <Field label="Имя" name="name" placeholder="Анна" required />
            <Field
              label="Телефон или email"
              name="contact"
              placeholder="+7… / email"
              required
            />
            <Field label="Город" name="city" placeholder="Москва" />
            <Field label="Адрес доставки" name="address" placeholder="Улица, дом, кв." />

            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-[0.22em] text-black/55">
                Сообщение
              </label>
              <textarea
                name="message"
                rows={4}
                className="mt-2 w-full rounded-[18px] border border-black/10 bg-[#fbf7f3] px-4 py-3 text-sm outline-none focus:border-black/25 transition"
                placeholder="Например: хочу заказать Soft Cream / нужна помощь с выбором"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-full bg-black text-[#fbf7f3] px-6 py-3 text-sm tracking-wide uppercase hover:opacity-90 transition disabled:opacity-60"
              >
                {status === "sending" ? "Отправляем..." : "Отправить"}
              </button>

              <p className="text-xs text-black/55 leading-relaxed">
                Нажимая «Отправить», ты соглашаешься на обработку данных.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.22em] text-black/55">
        {label}
      </label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[18px] border border-black/10 bg-[#fbf7f3] px-4 py-3 text-sm outline-none focus:border-black/25 transition"
      />
    </div>
  );
}