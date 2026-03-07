import Link from "next/link";
import { Suspense } from "react";
import ProductsGridClient from "@/components/ProductsGridClient";
import WaitlistLaunchButton from "@/components/WaitlistLaunchButton";
import { Reveal } from "@/components/Reveal";

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <Reveal>
        <div className="flex flex-col gap-6">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
              PASSION / КАТАЛОГ
            </div>

            <h1 className="mt-3 text-4xl leading-tight">Продукты</h1>

            <p className="mt-3 max-w-xl text-sm opacity-70">
              Продажи пока не открыты. Оставьте контакт, чтобы получить уведомление о старте.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Grid */}
      <Reveal delay={0.1}>
        <div className="mt-10">
          <Suspense fallback={null}>
            <ProductsGridClient />
          </Suspense>
        </div>
      </Reveal>

      {/* Bottom info */}
      <Reveal delay={0.2}>
        <div className="mt-12 rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur">
          <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
            Запуск продаж
          </div>

          <p className="mt-2 max-w-2xl text-sm opacity-70">
            Как только откроем продажи, отправим вам уведомление в Telegram или на email.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full
                         border border-neutral-300 bg-white/60 backdrop-blur
                         px-6 py-3 text-sm font-semibold tracking-wide text-neutral-900
                         transition-[background-color,transform] duration-300
                         hover:bg-neutral-100 active:scale-[0.98]"
            >
              На главную
            </Link>
            <WaitlistLaunchButton
              source="catalog"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-semibold tracking-wide uppercase text-white hover:opacity-90 transition sm:w-auto"
            />
          </div>
        </div>
      </Reveal>
    </div>
  );
}
