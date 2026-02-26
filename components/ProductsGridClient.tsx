"use client";

export default function ProductsGridClient() {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/60 p-8 text-center shadow-sm">
      <div className="text-xs uppercase tracking-[0.2em] text-black/50">Каталог</div>
      <h3 className="mt-3 text-2xl font-semibold text-black/90">Скоро всё будет</h3>
      <p className="mt-2 text-sm text-black/60">
        Мы обновляем ассортимент. Карточки товаров скоро появятся.
      </p>
    </div>
  );
}
