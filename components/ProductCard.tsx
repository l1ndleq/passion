"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

type ProductCardProps = {
  href: string;
  title: string;
  price: number;
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
    <div className="group rounded-2xl border border-black/5 bg-white/70 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-black/[0.03]">
          <Image
            src={img}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
          {badge ? (
            <span className="absolute left-2 top-2 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
              {badge}
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {title}
          </h3>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              {price.toLocaleString("ru-RU")} ₽
            </span>

            {/* чтобы клики по кнопкам не открывали страницу */}
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {actions}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}