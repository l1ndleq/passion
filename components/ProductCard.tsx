"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { sanitizeImageSrc } from "@/app/lib/xss";

export type Product = {
  id: string;
  title: string;
  price: number;
  description?: string;
  volume?: string;
  tag?: string;
  image?: string;
};

type ProductCardProps = {
  href: string;
  title: string;
  price?: number;
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
  const img = sanitizeImageSrc(image, "/images/placeholder-product.jpg");

  return (
    <div className="group flex flex-col">
      <Link href={href} className="block">
        {/* IMAGE */}
        <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl bg-black/[0.03]">
          <Image
            src={img}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.05]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={false}
          />
          <div className="absolute inset-0 z-10 bg-black/0 transition-colors duration-500 group-hover:bg-black/[0.04]" />

          {badge && (
            <span className="absolute left-3 top-3 z-20 rounded-full bg-white/90 px-2.5 py-1 text-[10px] uppercase tracking-wide text-black shadow-sm backdrop-blur">
              {badge}
            </span>
          )}
        </div>

        {/* CONTENT */}
        <div className="pt-3">
          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-black sm:text-sm md:text-base transition-colors duration-300 group-hover:text-black/70">
            {title}
          </h3>

          {typeof price === "number" && (
            <div className="mt-1 text-[13px] font-semibold text-black sm:text-sm md:text-base">
              {price.toLocaleString("ru-RU")} ₽
            </div>
          )}
        </div>
      </Link>

      {/* ACTIONS (кнопка добавить и т.п.) */}
      {actions && (
        <div className="mt-2 transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0">
          {actions}
        </div>
      )}
    </div>
  );
}
