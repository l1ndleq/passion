"use client";

import { useState } from "react";
import Link from "next/link";
import CartLinkClientOnly from "@/components/CartLinkClientOnly";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Burger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-11 h-11"
        aria-label="Меню"
      >
        <div className="space-y-1.5">
          <span className="block w-6 h-[2px] bg-black" />
          <span className="block w-6 h-[2px] bg-black" />
          <span className="block w-6 h-[2px] bg-black" />
        </div>
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        />
      )}

      {/* Slide panel */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-xl transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 space-y-6">
          <button
            onClick={() => setOpen(false)}
            className="text-sm uppercase tracking-widest text-neutral-500"
          >
            Закрыть
          </button>

          <nav className="flex flex-col gap-6 text-sm uppercase tracking-[0.22em]">
            <Link href="/" onClick={() => setOpen(false)}>
              Главная
            </Link>
            <Link href="/products" onClick={() => setOpen(false)}>
              Каталог
            </Link>
            <Link href="/account" onClick={() => setOpen(false)}>
              Кабинет
            </Link>
            <Link href="/contact" onClick={() => setOpen(false)}>
              Контакты
            </Link>
            <CartLinkClientOnly />
          </nav>
        </div>
      </div>
    </>
  );
}
