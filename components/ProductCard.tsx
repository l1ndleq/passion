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
<div className="relative h-[220px] w-full bg-black/[0.03] sm:h-[240px]">
  <Image
    src={img}
    alt={title}
    fill
    className="object-cover"
    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
  />
  {badge ? (
    <span className="absolute left-3 top-3 rounded-full bg-black/85 px-3 py-1 text-xs font-medium text-white">
      {badge}
    </span>
  ) : null}
</div>

        {/* ТЕКСТОВЫЙ БЛОК — принудительно читаемый */}
        <div className="p-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-black">
            {title}
          </h3>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-black">
              {price.toLocaleString("ru-RU")} ₽
            </span>

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