"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeOrderId(v: string) {
  return v.trim().replace(/\s+/g, "").toUpperCase();
}

type Props = {
  className?: string;
};

export default function OrderTrackHeader({ className = "" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const cleaned = useMemo(() => normalizeOrderId(value), [value]);
  const isValid = cleaned.length >= 6;

  const rootRef = useRef<HTMLDivElement | null>(null);

  function go() {
    if (!isValid) return;
    router.push(`/order/${cleaned}`);
    setOpen(false);
  }

  // ✅ fallback стиль (если не прокинули className из layout)
  const fallback =
    "relative transition-colors hover:text-black " +
    "after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full " +
    "after:origin-left after:scale-x-0 after:bg-black/60 " +
    "after:transition-transform after:duration-300 hover:after:scale-x-100";

  const triggerClass = className?.trim() ? className : fallback;

  // ✅ закрытие по клику вне + ESC
  useEffect(() => {
    if (!open) return;

    function onDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${triggerClass} leading-none`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Отслеживание заказа
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] rounded-2xl border bg-white shadow-lg p-3 z-50">
          <div className="text-xs text-neutral-500 mb-2">Введите номер заказа</div>

          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Напр. P-MLGLJ641"
              className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
              autoFocus
            />

            <button
              type="button"
              onClick={go}
              disabled={!isValid}
              className="border rounded-xl px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              Найти
            </button>
          </div>

          <div className="mt-2 text-[11px] text-neutral-500">
            Номер заказа есть в Telegram/на странице оплаты.
          </div>
        </div>
      )}
    </div>
  );
}
