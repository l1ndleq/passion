import Image from "next/image";
import Link from "next/link";

type Product = {
  id: string;
  title: string;
  price: number;
  image?: string | null;
  badge?: string | null;
};

export function ProductCard({ product }: { product: Product }) {
  const img = product.image?.trim() || "/images/placeholder-product.jpg";

  return (
    <div className="group rounded-2xl border border-black/5 bg-white/60 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-black/[0.03]">
          <Image
            src={img}
            alt={product.title}
            fill
            className="object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
          {product.badge ? (
            <div className="absolute left-2 top-2 rounded-full bg-black/80 px-3 py-1 text-xs text-white">
              {product.badge}
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          <div className="line-clamp-2 text-sm font-medium leading-snug">
            {product.title}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm font-semibold">
              {product.price.toLocaleString("ru-RU")} ₽
            </div>

            <button
              type="button"
              className="rounded-full bg-black px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
              // TODO: сюда подключим твою логику "в корзину"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              В корзину
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}