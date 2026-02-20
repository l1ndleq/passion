"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { sanitizeImageSrc } from "@/app/lib/xss";

function money(n: number) {
  try {
    return n.toLocaleString("ru-RU");
  } catch {
    return String(n);
  }
}

export default function MiniCartDrawer() {
  const { drawerOpen, closeDrawer, items, total, setQty, removeItem, lastAddedId } = useCart();

  // ESC закрывает
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  // блок скролла под оверлеем
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const highlightId = lastAddedId || items[items.length - 1]?.id;

  return (
    <>
      {/* overlay */}
      <div
        className={[
          "fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm transition-opacity",
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={closeDrawer}
      />

      {/* DESKTOP: right drawer */}
      <aside
        className={[
          "fixed right-0 top-0 z-[70] h-full w-[420px] max-w-[92vw]",
          "bg-white/85 backdrop-blur border-l border-black/10 shadow-2xl",
          "transition-transform duration-300 ease-out",
          drawerOpen ? "translate-x-0" : "translate-x-full",
          "hidden md:block",
        ].join(" ")}
      >
        <DrawerContent
          items={items}
          total={total}
          highlightId={highlightId}
          setQty={setQty}
          removeItem={removeItem}
          closeDrawer={closeDrawer}
        />
      </aside>

      {/* MOBILE: bottom sheet */}
      <aside
        className={[
          "fixed left-0 right-0 bottom-0 z-[70]",
          "bg-white/90 backdrop-blur border-t border-black/10 shadow-2xl",
          "rounded-t-3xl",
          "transition-transform duration-300 ease-out",
          drawerOpen ? "translate-y-0" : "translate-y-full",
          "md:hidden",
        ].join(" ")}
      >
        <DrawerContent
          items={items}
          total={total}
          highlightId={highlightId}
          setQty={setQty}
          removeItem={removeItem}
          closeDrawer={closeDrawer}
          mobile
        />
      </aside>
    </>
  );
}

function DrawerContent({
  items,
  total,
  highlightId,
  setQty,
  removeItem,
  closeDrawer,
  mobile = false,
}: {
  items: any[];
  total: number;
  highlightId?: string;
  setQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  closeDrawer: () => void;
  mobile?: boolean;
}) {
  const list = items.slice().reverse(); // последние сверху

  return (
    <div className={mobile ? "p-5 pb-6" : "p-6"}>
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">Корзина</div>
          <div className="mt-1 text-lg font-semibold text-black">Добавлено</div>
        </div>

        <button
          onClick={closeDrawer}
          className="rounded-2xl px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-black/60 hover:bg-black/[0.04] transition"
        >
          Закрыть
        </button>
      </div>

      <div className="mt-4 h-px bg-black/10" />

      {/* items */}
      <div className={mobile ? "mt-4 max-h-[48vh] overflow-auto pr-1" : "mt-5 max-h-[62vh] overflow-auto pr-2"}>
        {list.length === 0 ? (
          <div className="py-10 text-sm text-black/55">Корзина пока пустая.</div>
        ) : (
          <div className="space-y-3">
            {list.map((it: any) => {
              const isNew = it.id === highlightId;
              const safeImage = sanitizeImageSrc(it.image, "/images/placeholder-product.jpg");
              return (
                <div
                  key={it.id}
                  className={[
                    "rounded-2xl border border-black/10 bg-white/60 backdrop-blur",
                    "p-3 transition",
                    isNew ? "ring-1 ring-black/20" : "",
                  ].join(" ")}
                >
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/[0.03]">
                      <Image
                        src={safeImage}
                        alt={it.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-black">{it.name}</div>
                          <div className="mt-0.5 text-xs text-black/55">{money(it.price)} ₽ / шт</div>
                        </div>

                        <button
                          onClick={() => removeItem(it.id)}
                          className="text-xs uppercase tracking-[0.22em] text-black/45 hover:text-black/70 transition"
                        >
                          Удалить
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {/* stepper */}
                        <div className="inline-flex h-9 items-center overflow-hidden rounded-2xl border border-black/10 bg-white">
                          <button
                            onClick={() => (it.qty <= 1 ? removeItem(it.id) : setQty(it.id, it.qty - 1))}
                            className="grid h-9 w-9 place-items-center hover:bg-black/[0.04] transition active:scale-90"
                            aria-label="Минус"
                          >
                            <span className="text-[18px] leading-none text-black/80">−</span>
                          </button>
                          <div className="min-w-[34px] px-2 text-center text-[12px] font-medium tabular-nums text-black/85">
                            {it.qty}
                          </div>
                          <button
                            onClick={() => setQty(it.id, it.qty + 1)}
                            className="grid h-9 w-9 place-items-center hover:bg-black/[0.04] transition active:scale-90"
                            aria-label="Плюс"
                          >
                            <span className="text-[18px] leading-none text-black/80">+</span>
                          </button>
                        </div>

                        <div className="text-sm font-semibold tabular-nums text-black">
                          {money(it.price * it.qty)} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* footer */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-black/60">Итого</div>
          <div className="text-base font-semibold tabular-nums text-black">{money(total)} ₽</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={closeDrawer}
            className="h-10 rounded-2xl border border-black/10 bg-white/70 text-[11px] uppercase tracking-[0.22em] text-black/70 hover:bg-black/[0.04] transition"
          >
            Продолжить
          </button>

          <Link
            href="/cart"
            onClick={closeDrawer as any}
            className="h-10 rounded-2xl bg-black text-white text-[11px] uppercase tracking-[0.22em] grid place-items-center hover:opacity-90 transition"
          >
            В корзину
          </Link>
        </div>
      </div>
    </div>
  );
}
