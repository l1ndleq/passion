export default function ProductLoading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      {/* breadcrumbs */}
      <div className="text-[10px] tracking-[0.22em] uppercase text-black/55">
        <div className="h-3 w-64 rounded bg-black/10 animate-pulse" />
      </div>

      <section className="mt-8 grid gap-10 md:grid-cols-12">
        {/* image skeleton */}
        <div className="md:col-span-7">
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            <div className="h-[420px] w-full bg-black/10 animate-pulse md:h-[520px]" />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <div className="h-7 w-28 rounded-full bg-black/10 animate-pulse" />
            <div className="h-7 w-28 rounded-full bg-black/10 animate-pulse" />
            <div className="h-7 w-24 rounded-full bg-black/10 animate-pulse" />
          </div>
        </div>

        {/* info skeleton */}
        <div className="md:col-span-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="h-9 w-56 max-w-full rounded-xl bg-black/10 animate-pulse" />
              <div className="mt-3 h-4 w-24 rounded-lg bg-black/10 animate-pulse" />
            </div>
            <div className="h-6 w-24 rounded-full bg-black/10 animate-pulse" />
          </div>

          <div className="mt-6 space-y-2">
            <div className="h-4 w-[95%] rounded-lg bg-black/10 animate-pulse" />
            <div className="h-4 w-[88%] rounded-lg bg-black/10 animate-pulse" />
            <div className="h-4 w-[70%] rounded-lg bg-black/10 animate-pulse" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex gap-2">
              <div className="mt-[6px] h-1.5 w-1.5 rounded-full bg-black/20" />
              <div className="h-4 w-[80%] rounded-lg bg-black/10 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="mt-[6px] h-1.5 w-1.5 rounded-full bg-black/20" />
              <div className="h-4 w-[75%] rounded-lg bg-black/10 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="mt-[6px] h-1.5 w-1.5 rounded-full bg-black/20" />
              <div className="h-4 w-[65%] rounded-lg bg-black/10 animate-pulse" />
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-black/10 bg-white/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div className="h-6 w-20 rounded-lg bg-black/10 animate-pulse" />
              <div className="h-10 w-32 rounded-full bg-black/10 animate-pulse" />
            </div>
            <div className="mt-3 h-3 w-[90%] rounded bg-black/10 animate-pulse" />
          </div>

          <div className="mt-6 flex gap-4">
            <div className="h-4 w-24 rounded bg-black/10 animate-pulse" />
            <div className="h-4 w-20 rounded bg-black/10 animate-pulse" />
          </div>
        </div>
      </section>
    </main>
  );
}
