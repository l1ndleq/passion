export default function LoadingProducts() {
  const items = Array.from({ length: 6 });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Верх */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
            PASSION / PRODUCTS
          </div>

          <div className="mt-3 h-10 w-48 rounded-xl bg-black/10 animate-pulse" />
          <div className="mt-3 h-4 w-[420px] max-w-full rounded-lg bg-black/10 animate-pulse" />
        </div>

        <div className="h-4 w-16 rounded-lg bg-black/10 animate-pulse" />
      </div>

      {/* Сетка */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-white/40 p-5 flex flex-col"
          >
            <div className="h-[170px] w-full rounded-2xl bg-black/10 animate-pulse" />

            <div className="mt-5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-5 w-36 rounded-lg bg-black/10 animate-pulse" />
                <div className="mt-2 h-3 w-20 rounded-lg bg-black/10 animate-pulse" />
              </div>

              <div className="h-6 w-20 rounded-full bg-black/10 animate-pulse" />
            </div>

            <div className="mt-4 h-4 w-[85%] rounded-lg bg-black/10 animate-pulse" />
            <div className="mt-2 h-4 w-[70%] rounded-lg bg-black/10 animate-pulse" />

            <div className="mt-auto pt-6 flex items-center justify-between gap-4">
              <div className="h-4 w-16 rounded-lg bg-black/10 animate-pulse" />
              <div className="h-10 w-28 rounded-full bg-black/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Нижний блок */}
      <div className="mt-12 rounded-2xl border p-5 bg-white/30">
        <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
          Доставка
        </div>
        <div className="mt-2 h-4 w-[520px] max-w-full rounded-lg bg-black/10 animate-pulse" />
        <div className="mt-2 h-4 w-[420px] max-w-full rounded-lg bg-black/10 animate-pulse" />

        <div className="mt-4 flex gap-3">
          <div className="h-10 w-36 rounded-full bg-black/10 animate-pulse" />
          <div className="h-10 w-32 rounded-full bg-black/10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
