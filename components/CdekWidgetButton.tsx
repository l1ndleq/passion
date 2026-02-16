"use client";

import { useEffect, useRef, useState } from "react";

type CdekResult = {
  pvz?: { code?: string; address?: string; name?: string };
  type?: "pvz" | "door";
  price?: number;
  period_min?: number;
  period_max?: number;
  tariff_code?: number;
};

export default function CdekWidgetButton({
  onSelect,
}: {
  onSelect: (data: CdekResult) => void;
}) {
  const inited = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    let destroyed = false;

    (async () => {
      if (inited.current) return;
      inited.current = true;

      // Важно: динамический импорт, чтобы не ломать SSR
      const mod = await import("@cdek-it/widget");
      if (destroyed) return;

      // По документации/примерам виджет инициализируется в контейнер
      // (точные опции зависят от того, что ты выберешь: ПВЗ/дверь/оба)
      // Здесь “скелет”: ты точно подставишь свои параметры из доки.
      const CDEKWidget = (mod as any).default ?? (mod as any);

new CDEKWidget({
  root: "cdek-widget-root",

  // ✅ Яндекс ключ
  apiKey: process.env.NEXT_PUBLIC_YMAPS_KEY,

  // ✅ важное: если ты сделал наш route
  servicePath: "/api/cdek/service",

  // ✅ ОБЯЗАТЕЛЬНО: откуда отправка
  from: "Москва",

  // ✅ ОБЯЗАТЕЛЬНО: габариты (иначе он не считает и не поднимает город)
  goods: [
    { weight: 500, length: 10, width: 10, height: 10 }, // 0.5 кг, 10x10x10
  ],

  // ✅ дефолтный город (строкой тоже можно, но у тебя сейчас ломается — поэтому так)
  defaultLocation: "Москва",

  // ✅ какие режимы разрешить (если есть такой флаг — зависит от версии)
  canChoose: true,

  onChoose: (res: any) => {
    onSelect(res);
    setOpen(false);
  },
});

    })();

    return () => {
      destroyed = true;
    };
  }, [open, onSelect]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="rounded-xl border px-4 py-3 text-sm hover:bg-black/[0.03] transition"
        onClick={() => setOpen(true)}
      >
        Выбрать доставку СДЭК
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/40 p-4">
          <div className="mx-auto h-[80vh] max-w-5xl overflow-hidden rounded-2xl bg-white shadow">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-medium">Доставка СДЭК</div>
              <button
                type="button"
                className="text-sm text-black/60 hover:text-black"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <div id="cdek-widget-root" className="h-[calc(80vh-52px)]" />
          </div>
        </div>
      )}
    </div>
  );
}
