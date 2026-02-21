"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { InfiniteMarquee } from "@/components/InfiniteMarquee";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

type Product = {
  slug: string;
  name: string;
  subtitle: string;
  category: string;
  note: string;
  image?: string;
  badge?: string;
};

const featured: Product[] = [
  {
    slug: "silk-cleanser",
    name: "Шелковый очищающий гель",
    subtitle: "Нежное очищение",
    category: "Очищение",
    note: "Мягкое ежедневное очищение, которое сохраняет комфорт кожи.",
    badge: "Новинка",
  },
  {
    slug: "glow-serum",
    name: "Сияющая сыворотка",
    subtitle: "Ежедневное сияние",
    category: "Сыворотка",
    note: "Лёгкая формула для ровного тона и естественного сияния кожи.",
    badge: "Хит продаж",
  },
  {
    slug: "soft-cream",
    name: "Мягкий крем",
    subtitle: "Поддержка барьера",
    category: "Крем",
    note: "Поддержка кожного барьера и ощущение уюта в течение дня.",
  },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <main>
      <Reveal>
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-5 pt-16 pb-16 md:pt-28 md:pb-24" ref={containerRef}>
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-7">
              <p className="text-xs uppercase tracking-[0.22em] text-black/55">
                passion / уход за кожей
              </p>

              <h1 className="mt-5 text-[44px] leading-[0.98] md:text-[86px] tracking-[-0.03em] font-light">
                <Image
                  src="/brand/logo.png"
                  alt="PASSION"
                  width={420}
                  height={140}
                  priority
                  className="inline-block align-baseline translate-y-[6px] md:translate-y-[10px]"
                />
              </h1>



              <p className="mt-6 max-w-xl text-base md:text-lg text-black/70 leading-relaxed">
                Современный уход для повседневной жизни.
                Чистые формулы, мягкие текстуры и спокойная уверенность в результате.

              </p>

              <div className="mt-10 flex items-center gap-3">
                <Link
                  href="/products"
                  className="rounded-full bg-black text-[#fbf7f3] px-6 py-3 text-sm tracking-wide uppercase hover:opacity-90 transition"
                >
                  Каталог
                </Link>

              </div>

              <div className="mt-10 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-black/50">
                <span className="rounded-full border border-black/10 px-3 py-2 bg-white/30">
                  Чистые формулы
                </span>
                <span className="rounded-full border border-black/10 px-3 py-2 bg-white/30">
                  Мягкие текстуры
                </span>
                <span className="rounded-full border border-black/10 px-3 py-2 bg-white/30">
                  Ежедневный уход
                </span>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="relative h-[520px] w-full overflow-hidden rounded-[32px]">
                <motion.div style={{ y }} className="absolute inset-0 z-0 h-[120%] -top-[10%]">
                  <Image
                    src="/images/hero-texture.jpg"
                    alt="Текстура продукта"
                    fill
                    priority
                    className="object-cover"
                  />
                </motion.div>
                <span className="absolute bottom-4 left-4 text-[10px] tracking-[0.22em] text-black/50 z-10">
                  ТЕКСТУРА ПРОДУКТА
                </span>
              </div>
            </div> {/* ✅ закрыли md:col-span-5 */}

          </div> {/* ✅ закрыли grid */}
        </section>

      </Reveal>

      {/* MARQUEE */}
      <Reveal delay={0.2}>
        <InfiniteMarquee />
      </Reveal>

      <Reveal>
        {/* ABOUT */}
        <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24 md:pb-20">
          <div className="grid md:grid-cols-12 gap-10 items-start">
            <h2 className="md:col-span-4 text-2xl md:text-3xl font-light tracking-[-0.02em]">
              О бренде
            </h2>
            <div className="md:col-span-8">
              <p className="text-lg md:text-xl leading-relaxed text-black/75">
                Passion — это магия на коже, которая раскрывается в каждом прикосновении.
                Мы создаём продуманные средства для ежедневного ухода, которые дарят
                комфорт и уверенность в себе. Наша миссия — помочь вам полюбить свою
                кожу и наслаждаться каждым моментом ухода.
              </p>
              <Link
                href="/about"
                className="mt-6 inline-block text-sm underline underline-offset-4 text-black/70 hover:text-black transition"
              >
                Узнать больше о бренде →
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
      <Reveal>
        {/* PRODUCTS */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-4xl font-light tracking-[-0.03em]">
                Ассортимент
              </h2>
              <p className="mt-3 max-w-md text-sm md:text-base text-black/60">
                Базовые средства для продуманного ежедневного ухода за кожей.
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full
             bg-neutral-900 px-6 py-3
             text-sm font-semibold tracking-wide text-white
             transition-[background-color,transform,opacity] duration-300 ease-out
             hover:bg-neutral-800 active:scale-[0.98]"
            >
              Смотреть все →
            </Link>


          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featured.map((p, idx) => (
              <ProductCard
                key={p.slug}
                href={`/products/${p.slug}`}
                title={`${p.name} · ${p.subtitle}`}
                price={0}
                image={"/images/placeholder-product.jpg"}
                badge={p.category}
                actions={
                  <span
                    className="inline-flex items-center justify-center rounded-full
             bg-neutral-900 px-4 py-2
             text-xs font-semibold tracking-wide text-white
             transition-[background-color,transform,opacity] duration-300 ease-out
             group-hover:bg-neutral-800 group-hover:opacity-95
             group-active:scale-[0.98]"
                  >
                    Перейти →
                  </span>

                }
              />
            ))}
          </div>




        </section>
      </Reveal>
      <Reveal>
        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="rounded-[32px] border border-black/10 bg-white/30 p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-light tracking-[-0.02em]">
              Нужна помощь с выбором?
            </h2>
            <p className="mt-4 max-w-2xl text-black/70 leading-relaxed">
              Мы подскажем продукты под ваш уход и ответим на любые вопросы.
            </p>

            <div className="mt-8 flex gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-black text-[#fbf7f3] px-6 py-3 text-sm tracking-wide uppercase hover:opacity-90 transition"
              >
                Написать нам
              </Link>
              <Link
                href="/products"
                className="rounded-full border border-black/15 px-6 py-3 text-sm tracking-wide uppercase hover:border-black/30 transition"
              >
                Каталог
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

    </main>
  );

}
