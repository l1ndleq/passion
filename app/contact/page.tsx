import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export const metadata = {
  title: "Контакты — Passion",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Reveal>
        <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
          PASSION / КОНТАКТЫ
        </div>

        <h1 className="mt-3 text-4xl leading-tight">Контакты</h1>

        <p className="mt-3 max-w-xl text-sm opacity-70">
          Напиши нам — ответим по заказам, продуктам и доставке.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Reveal delay={0.1}>
          <div className="rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur h-full">
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
              <span className="tg-btn__icon" aria-hidden="true">
                <TelegramLogoIcon className="h-4 w-4" />
              </span>
              Открыть Телеграм →
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur h-full">
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
        </Reveal>
      </div>

      <Reveal delay={0.3}>
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
      </Reveal>
    </div>
  );
}

function TelegramLogoIcon({ className = "h-5 w-5" }: { className?: string }) {
  const iconClassName = `${className} block shrink-0`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClassName}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        fill="#FFFFFF"
        d="M17.34 7.31 6.12 11.64c-.77.31-.76.74-.14.93l2.88.9 1.11 3.44c.13.36.07.51.45.51.29 0 .42-.13.58-.28l1.39-1.35 2.89 2.13c.53.29.91.14 1.04-.5l1.9-8.96c.2-.78-.3-1.13-.88-.88Zm-1.66 1.58-4.93 4.45-.19 2.1-.87-2.73 5.99-3.82Z"
      />
    </svg>
  );
}
