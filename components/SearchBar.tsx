"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      className={["relative", className].join(" ")}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск…"
        className="w-full rounded-full border border-neutral-300 bg-white/60 backdrop-blur
                   px-4 py-2.5 text-sm outline-none
                   transition focus:border-neutral-400"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1.5 rounded-full bg-neutral-900 px-4 py-2
                   text-xs font-semibold tracking-wide text-white
                   transition hover:bg-neutral-800 active:scale-[0.98]"
      >
        Найти
      </button>
    </form>
  );
}
