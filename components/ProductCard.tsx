"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

export type Product = {
  id: string;
  title: string;
  price: number;
  description?: string;
  volume?: string;
  tag?: string;
  image?: string;
};

export const PRODUCTS: Product[] = [
  { id: "silk-cleanser", title: "Silk Cleanser", price: 1490, tag: "New" },
  { id: "glow-serum", title: "Glow Serum", price: 1690, tag: "Bestseller" },
  { id: "soft-cream", title: "Soft Cream", price: 1490 },
  { id: "body-oil", title: "Body Oil", price: 1290 },
  { id: "scrub", title: "Scrub", price: 990, tag: "New" },
];


type ProductCardProps = {
  href: string;
  title: string;
  price?: number; // ✅ опционально (чтобы на главной не показывать 0 ₽)
  image?: string | null;
  badge?: string | null;
  actions?: ReactNode;
};

export function ProductCard({
  href,
  title,
  price,
  image,
  badge,
  actions,
}: ProductCardProps) {
  const img = image?.trim() || "/images/placeholder-product.jpg";

  return (
  <div className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
    <Link href={href} className="block">
      <div className="relative w-full overflow-hidden rounded-3xl bg-black/[0.03] aspect-[4/5]">
  <Image
    src={img}
    alt={title}
    fill
    className="object-cover object-top"
    sizes="(max-width: 1024px) 100vw, 50vw"
    priority
  />
</div>


      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-black">
          {title}
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3">
          {typeof price === "number" ? (
            <span className="text-sm font-semibold text-black">
              {price.toLocaleString("ru-RU")} ₽
            </span>
          ) : (
            <span />
          )}

          {actions ? (
            <div className="transition-all duration-300 ease-out md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  </div>
);

}