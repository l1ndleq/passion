"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function MobileSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // focus + esc close
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const submit = () => {
    const query = q.trim();
    setOpen(false);
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
  };

  return (
    <>
      {/* Button in header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Открыть поиск"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full
                   border border-black/10 bg-white/60 backdrop-blur
                   transition hover:bg-black/[0.03] active:scale-[0.98]"
      >
        {/* simple magnifier */}
        <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 21l-4.3-4.3" />
          <circle cx="11" cy="11" r="7" />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="true"
          aria-label="Поиск"
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="Закрыть поиск"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          {/* panel */}
          <div className="absolute left-1/2 top-5 w-[min(92vw,520px)] -translate-x-1/2">
            <div className="rounded-3xl border border-black/10 bg-[#fbf7f3]/95 p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск по продуктам…"
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3
                             text-sm outline-none transition focus:border-black/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />

                <button
                  type="button"
                  onClick={submit}
                  className="inline-flex items-center justify-center rounded-2xl
                             bg-neutral-900 px-4 py-3 text-sm font-semibold text-white
                             transition hover:bg-neutral-800 active:scale-[0.98]"
                >
                  Найти
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between px-1">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">
                  Enter — поиск
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs underline underline-offset-4 text-black/60 hover:text-black"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
