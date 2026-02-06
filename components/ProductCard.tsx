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
        {/* image */}
        <div className="relative h-[220px] w-full bg-black/[0.03] sm:h-[240px]">
          <Image
            src={img}
            alt={title}
            fill
            className="h-[220px] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          {badge ? (
            <span className="absolute left-3 top-3 rounded-full bg-black/85 px-3 py-1 text-xs font-medium text-white">
              {badge}
            </span>
          ) : null}
        </div>

        {/* content */}
        <div className="p-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-black">
            {title}
          </h3>

          <div className="mt-3 flex items-center justify-between gap-3">
            {/* price (optional) */}
            {typeof price === "number" ? (
              <span className="text-sm font-semibold text-black">
                {price.toLocaleString("ru-RU")} ₽
              </span>
            ) : (
              <span />
            )}

            {/* actions */}
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