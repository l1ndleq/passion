"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CartLinkClientOnly from "@/components/CartLinkClientOnly";

const LINK =
  "text-[12px] uppercase tracking-[0.22em] text-black/80 hover:text-black transition-colors";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Burger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-black/[0.04]"
        aria-label="Открыть меню"
      >
        <div className="space-y-1.5">
          <span className="block w-6 h-[2px] bg-black/80" />
          <span className="block w-6 h-[2px] bg-black/80" />
          <span className="block w-6 h-[2px] bg-black/80" />
        </div>
      </button>

      {/* Overlay + Panel */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* panel */}
          <div
            className="absolute left-3 right-3 top-3 rounded-3xl border border-black/10 bg-white/90 shadow-xl backdrop-blur p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">
                Меню
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-black/60 hover:bg-black/[0.04]"
              >
                Закрыть
              </button>
            </div>

            <div className="mt-4 h-px bg-black/10" />

            <nav className="mt-5 flex flex-col gap-5">
              <Link href="/" className={LINK} onClick={() => setOpen(false)}>
                Главная
              </Link>
              <Link href="/products" className={LINK} onClick={() => setOpen(false)}>
                Каталог
              </Link>
              <Link href="/account" className={LINK} onClick={() => setOpen(false)}>
                Кабинет
              </Link>
              <Link href="/contact" className={LINK} onClick={() => setOpen(false)}>
                Контакты
              </Link>

              <div className="mt-1">
                <CartLinkClientOnly className={LINK} variant="text" />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
