import Link from "next/link";

export const metadata = {
  title: "Контакты — Passion",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
        PASSION / КОНТАКТЫ
      </div>

      <h1 className="mt-3 text-4xl leading-tight">Контакты</h1>

      <p className="mt-3 max-w-xl text-sm opacity-70">
        Напиши нам — ответим по заказам, продуктам и доставке.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur">
          <div className="text-xs font-semibold tracking-wide">Телеграм</div>
          <p className="mt-2 text-sm opacity-70">Самый быстрый способ связи.</p>

          <a
            href="https://t.me/@asssion6"
            target="_blank"
            rel="noreferrer"
            className="tg-btn mt-4 inline-flex items-center justify-center gap-2 rounded-full
                       px-6 py-3 text-sm font-semibold tracking-wide
                       transition-[transform,opacity] duration-300 ease-out active:scale-[0.98]"
          >
            <span className="tg-btn__icon" aria-hidden="true">✈</span>
            Открыть Телеграм →
          </a>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur">
          <div className="text-xs font-semibold tracking-wide">Эл. почта</div>
          <p className="mt-2 text-sm opacity-70">
            Для подробных вопросов и сотрудничества.
          </p>

          <a
            href="mailto:support@passion.ru"
            className="mt-4 inline-flex items-center justify-center rounded-full
                       border border-neutral-300 bg-white/60 backdrop-blur
                       px-6 py-3 text-sm font-semibold tracking-wide text-neutral-900
                       transition-[background-color,transform] duration-300
                       hover:bg-neutral-100 active:scale-[0.98]"
          >
            Написать на почту
          </a>
        </div>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full
                     border border-neutral-300 bg-white/60 backdrop-blur
                     px-6 py-3 text-sm font-semibold tracking-wide text-neutral-900
                     transition-[background-color,transform] duration-300
                     hover:bg-neutral-100 active:scale-[0.98]"
        >
          ← На главную
        </Link>
      </div>
    </div>
  );
}
