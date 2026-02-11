"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

type ProductLite = {
  id: string;
  title?: string;
  name?: string;
  price: number;
  image?: string;
};

export default function AddToCartButton({
  product,
  className = "",
}: {
  product: ProductLite;
  className?: string;
}) {
  const { addItem } = useCart();

  const label = useMemo(
    () => product.title || product.name || "Товар",
    [product.title, product.name]
  );

  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 700);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <button
      type="button"
      onClick={() => {
        addItem(
          {
            id: product.id,
            name: label,
            price: product.price,
            image: product.image,
          },
          1
        );
        setAdded(true);
      }}
      className={[
        "relative h-11 rounded-full px-5 text-sm font-medium transition",
        "active:scale-[0.98] focus:outline-none",
        // базовое состояние
        !added
          ? "bg-black text-white hover:bg-black/90"
          : // ✅ success состояние (зелёное)
            "bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.25)]",
        // pop анимация
        added ? "animate-[passion-pop_700ms_ease-out]" : "",
        className,
      ].join(" ")}
      aria-label="Добавить в корзину"
    >
      {/* ✅ shine */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0 overflow-hidden rounded-full",
          added ? "opacity-100" : "opacity-0",
          "transition-opacity duration-200",
        ].join(" ")}
      >
        <span className="absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-white/35 blur-sm animate-[passion-shine_700ms_ease-out]" />
      </span>

      <span className="relative flex items-center justify-center gap-2">
        {added ? (
          <>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
              {/* чек */}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Добавлено</span>
          </>
        ) : (
          <span>В корзину</span>
        )}
      </span>

      {/* ✅ локальные keyframes, чтобы не трогать tailwind.config */}
      <style jsx>{`
        @keyframes passion-pop {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.04);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes passion-shine {
          0% {
            transform: translateX(0) rotate(12deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translateX(260%) rotate(12deg);
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
}
