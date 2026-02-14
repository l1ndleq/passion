import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { PRODUCTS } from "@/app/lib/products";
import AddToCartButton from "@/components/add-to-cart-button";
import ProductsGridClient from "@/components/ProductsGridClient";
import ProductDetails from "@/components/ProductDetails";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = PRODUCTS.find((p) => p.id === slug);
  if (!product) return notFound();

  const others = PRODUCTS.filter((p) => p.id !== slug).slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      {/* breadcrumbs */}
      <div className="text-[10px] tracking-[0.22em] uppercase text-black/55">
        <Link href="/" className="hover:text-black transition">
          passion
        </Link>
        <span className="mx-2 text-black/40">/</span>
        <Link href="/products" className="hover:text-black transition">
          products
        </Link>
        <span className="mx-2 text-black/40">/</span>
        <span className="text-black/70">{product.title}</span>
      </div>

      <section className="mt-8 grid gap-10 md:grid-cols-12">
        {/* image */}
        <div className="md:col-span-7 overflow-hidden rounded-3xl border border-black/10 bg-white">
          <div className="relative w-full bg-[#f6f3ef]">
            <Image
  src={product.image || "/images/placeholder-product.jpg"}
  alt={product.title}
  width={900}
  height={1100}
  priority
  className="w-full h-auto object-contain"
  sizes="(max-width: 1024px) 100vw, 58vw"
/>

          </div>
        </div>

        {/* info */}
        <div className="md:col-span-5">
          <h1 className="text-3xl md:text-4xl font-light tracking-[-0.02em]">
            {product.title}
          </h1>

          {product.volume ? (
            <div className="mt-2 text-sm text-black/60">{product.volume}</div>
          ) : null}

          {product.description ? (
            <p className="mt-5 text-base leading-relaxed text-black/70">
              {product.description}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="text-lg font-semibold">
              {product.price.toLocaleString("ru-RU")} ₽
            </div>
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
              ← Вернуться в каталог
            </Link>

            <AddToCartButton
              product={{
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
              }}
            />
          </div>

          {/* ✅ details (состав / применение / о продукте) */}
          <ProductDetails
            sections={[
              {
                title: "О продукте",
                content:
                  product.description ||
                  "Мягкое ежедневное очищение, которое бережно удаляет загрязнения, сохраняя комфорт кожи.",
              },
              {
                title: "Состав",
                content:
                  // если в product появится поле ingredients — замени сюда
                  "Aqua, Glycerin, Coco-Glucoside, Panthenol, Sodium Hyaluronate, Chamomilla Extract.",
              },
              {
                title: "Способ применения",
                content:
                  "Нанесите небольшое количество на влажную кожу, мягко массируйте 30–40 секунд, затем смойте теплой водой.",
              },
            ]}
          />

          {others.length > 0 ? (
            <section className="mt-16">
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 className="text-lg md:text-xl font-semibold tracking-[-0.02em]">
                  Вам также может понравиться
                </h2>

                <Link
                  href="/products"
                  className="text-xs tracking-[0.22em] uppercase text-black/55 hover:text-black transition"
                >
                  Смотреть все →
                </Link>
              </div>

              <ProductsGridClient products={others} />
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
