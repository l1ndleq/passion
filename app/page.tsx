import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";

type Product = {
  slug: string;
  name: string;
  subtitle: string;
  category: string;
  note: string;
  // если позже добавишь картинки — просто начни прокидывать сюда:
  image?: string;
  badge?: string;
};

const featured: Product[] = [
  {
    slug: "silk-cleanser",
    name: "Silk Cleanser",
    subtitle: "Gentle Cleanser",
    category: "Очищение",
    note: "Мягкое ежедневное очищение, которое сохраняет комфорт кожи.",
    badge: "New",
  },
  {
    slug: "glow-serum",
    name: "Glow Serum",
    subtitle: "Daily Radiance",
    category: "Сыворотка",
    note: "Ровный тон и естественное сияние без утяжеления.",
    badge: "Bestseller",
  },
  {
    slug: "soft-cream",
    name: "Soft Cream",
    subtitle: "Barrier Support",
    category: "Крем",
    note: "Поддержка кожного барьера и ощущение уюта в течение дня.",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-16 md:pt-28 md:pb-24">
        <div className="grid md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-7">
            <p className="text-xs uppercase tracking-[0.22em] text-black/55">
              passion / skincare
            </p>

            <h1 className="mt-5 text-[44px] leading-[0.98] md:text-[86px] tracking-[-0.03em] font-light">
              passion
            </h1>

            <p className="mt-6 max-w-xl text-base md:text-lg text-black/70 leading-relaxed">
              Современная косметика для ежедневного ухода. Чистые формулы,
              мягкие текстуры и спокойная уверенность в результате.
            </p>

            <div className="mt-10 flex items-center gap-3">
              <Link
                href="/products"
                className="rounded-full bg-black text-[#fbf7f3] px-6 py-3 text-sm tracking-wide uppercase hover:opacity-90 transition"
              >
                Каталог
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-black/15 px-6 py-3 text-sm tracking-wide uppercase hover:border-black/30 transition"
              >
                Связаться
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-black/50">
              <span className="rounded-full border border-black/10 px-3 py-2 bg-white/30">
                clean formulas
              </span>
              <span className="rounded-full border border-black/10 px-3 py-2 bg-white/30">
                soft textures
              </span>
              <span className="rounded-full border border-black/10 px-3 py-2 bg-white/30">
                daily care
              </span>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="aspect-[4/5] rounded-[28px] border border-black/10 bg-gradient-to-b from-black/[0.06] to-black/[0.02]" />
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-black/55">
              product texture
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="mx-auto max-w-6xl px-5 pb-14 md:pb-20">
        <div className="grid md:grid-cols-12 gap-10 items-start">
          <h2 className="md:col-span-4 text-2xl md:text-3xl font-light tracking-[-0.02em]">
            О бренде
          </h2>
          <div className="md:col-span-8">
            <p className="text-lg md:text-xl leading-relaxed text-black/75">
              Passion — это уход, встроенный в ритм жизни. Мы создаём продукты,
              которые легко использовать каждый день, не перегружая кожу и
              пространство вокруг.
            </p>
            <Link
              href="/about"
              className="mt-6 inline-block text-sm underline underline-offset-4 text-black/70 hover:text-black transition"
            >
              Подробнее о бренде
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-4xl font-light tracking-[-0.03em]">
              Ассортимент
            </h2>
            <p className="mt-3 max-w-md text-sm md:text-base text-black/60">
              Базовые средства для продуманного ежедневного ухода.
            </p>
          </div>

          <Link
            href="/products"
            className="hidden md:inline-block text-sm underline underline-offset-4 hover:opacity-70 transition"
          >
            Смотреть все
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featured.map((p, idx) => (
            <ProductCard
              key={p.slug}
              href={`/product/${p.slug}`}
              title={`${p.name} · ${p.subtitle}`}
              price={0} // на главной можно не показывать цену; если будет — подставишь
              image={
                p.image ||
                (idx % 2 === 0
                  ? "/images/placeholder-product.jpg"
                  : "/images/placeholder-product.jpg")
              }
              badge={p.badge || p.category}
              actions={
                <span className="text-xs underline underline-offset-4 text-black/70 hover:opacity-70 transition">
                  Перейти
                </span>
              }
            />
          ))}
        </div>

        <Link
          href="/products"
          className="mt-8 inline-block md:hidden text-sm underline underline-offset-4"
        >
          Смотреть все
        </Link>
      </section>

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
    </main>
  );
}