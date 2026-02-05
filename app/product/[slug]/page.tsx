import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/ProductCard";
import type { Metadata } from "next";



type Product = {
  id: string;
  title: string;
  price: number;
  description?: string;
  volume?: string;
  tag?: string;
  image?: string;
  details?: string[];
};

const PRODUCTS: Product[] = [
  {
    id: "soft-cream",
    title: "Soft Cream",
    price: 1490,
    volume: "150 ml",
    description: "Нежный крем для ежедневного ухода и восстановления.",
    tag: "Bestseller",
    image: "/images/placeholder-product.jpg",
    details: [
      "Поддержка барьерной функции кожи",
      "Комфортная текстура без липкости",
      "Подходит для ежедневного применения",
    ],
  },
  {
    id: "body-oil",
    title: "Body Oil",
    price: 1290,
    volume: "100 ml",
    description: "Питательное масло для тела — мягкость и сияние кожи.",
    image: "/images/placeholder-product.jpg",
    details: ["Лёгкое распределение", "Эффект мягкости", "Ежедневный уход"],
  },
  {
    id: "scrub",
    title: "Scrub",
    price: 990,
    volume: "200 ml",
    description: "Скраб для гладкости: обновление и тонус.",
    tag: "New",
    image: "/images/placeholder-product.jpg",
    details: ["Обновляет текстуру кожи", "Тонизирует", "Ровный, гладкий рельеф"],
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const product = PRODUCTS.find((p) => p.id === slug);

  if (!product) {
    return {
      title: "Товар не найден — PASSION",
      description: "Страница товара не найдена.",
    };
  }

  const titleParts = [
    product.title,
    product.volume ? `· ${product.volume}` : null,
    "— PASSION",
  ].filter(Boolean);

  const title = titleParts.join(" ");
  const description =
    product.description?.trim() ||
    "Современная косметика PASSION для ежедневного ухода.";

  return {
    title,
    description,
  openGraph: {
  title,
  description,
  images: product.image ? [{ url: product.image }] : undefined,
  type: "website",
},

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}


export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = PRODUCTS.find((p) => p.id === slug);
  if (!product) return notFound();

  const related = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      {/* breadcrumbs */}
      <div className="text-[10px] tracking-[0.22em] uppercase text-black/55">
        <Link href="/" className="hover:text-black transition">
          passion
        </Link>{" "}
        /{" "}
        <Link href="/products" className="hover:text-black transition">
          products
        </Link>{" "}
        / <span className="text-black/70">{product.title}</span>
      </div>

      {/* top */}
      <section className="mt-8 grid gap-10 md:grid-cols-12">
        {/* image */}
        <div className="md:col-span-7">
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            {/* без next/image fill, чтобы не растягивалось */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image || "/images/placeholder-product.jpg"}
              alt={product.title}
              className="h-[420px] w-full object-cover md:h-[520px]"
            />
          </div>

          {/* small note */}
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-black/50">
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

        {/* info */}
        <div className="md:col-span-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-light tracking-[-0.03em]">
                {product.title}
              </h1>
              {product.volume ? (
                <div className="mt-2 text-sm text-black/65">
                  {product.volume}
                </div>
              ) : null}
            </div>

            {product.tag ? (
              <div className="text-[10px] tracking-[0.18em] uppercase px-3 py-1 rounded-full border border-black/15 text-black/60">
                {product.tag}
              </div>
            ) : null}
          </div>

          {product.description ? (
            <p className="mt-5 text-base leading-relaxed text-black/70">
              {product.description}
            </p>
          ) : null}

          {product.details?.length ? (
            <ul className="mt-6 space-y-2 text-sm text-black/70">
              {product.details.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-black/30" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 rounded-3xl border border-black/10 bg-white/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div className="text-lg font-semibold">
                {product.price.toLocaleString("ru-RU")} ₽
              </div>

              <AddToCartButton
                product={{
                  id: product.id,
                  title: product.title,
                  price: product.price,
                }}
              />
            </div>

            <p className="mt-3 text-xs text-black/55">
              Оплата на чекауте. Уведомление в Telegram отправится после
              оформления заказа.
            </p>
          </div>

       <div className="mt-6 flex flex-wrap gap-3">
  <Link
    href="/products"
    className="inline-flex items-center justify-center rounded-full
               border border-neutral-300 bg-white/60 backdrop-blur
               px-5 py-2.5 text-sm font-semibold tracking-wide text-neutral-900
               transition-[background-color,transform] duration-300
               hover:bg-neutral-100 active:scale-[0.98]"
  >
    ← В каталог
  </Link>

  <Link
    href="/cart"
    className="inline-flex items-center justify-center rounded-full
               bg-neutral-900 px-6 py-2.5
               text-sm font-semibold tracking-wide text-white
               transition-[background-color,transform] duration-300
               hover:bg-neutral-800 active:scale-[0.98]"
  >
    Корзина →
  </Link>
</div>

        </div>
      </section>

      {/* related */}
      {related.length ? (
        <section className="mt-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-light tracking-[-0.02em]">
                Похожие продукты
              </h2>
              <p className="mt-2 text-sm text-black/60">
                Ещё несколько вариантов для вашего ухода.
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

     <div className="mt-8 grid gap-5 md:grid-cols-3">
  {related.map((p) => (
    <ProductCard
      key={p.id}
      href={`/product/${p.id}`}
      title={p.volume ? `${p.title} · ${p.volume}` : p.title}
      price={p.price}
      image={p.image || "/images/placeholder-product.jpg"}
      badge={p.tag || "Care"}
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
      ) : null}
    </main>
  );
}
