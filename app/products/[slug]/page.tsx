import Link from "next/link";
import { notFound } from "next/navigation";
import CartButtonClientOnly from "@/components/CartButtonClientOnly";
import { PRODUCTS } from "@/app/lib/products";

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = PRODUCTS.find((p) => p.id === params.slug);
  if (!product) return notFound();

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image || "/images/placeholder-product.jpg"}
            alt={product.title}
            className="h-[420px] w-full object-cover md:h-[520px]"
          />
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

            <CartButtonClientOnly
              product={{
                id: product.id,
                title: product.title,
                price: product.price,
              }}
            />
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
    </main>
  );
}
