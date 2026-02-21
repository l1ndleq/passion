import { Reveal } from "@/components/Reveal";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <Reveal>
        <p className="text-xs uppercase tracking-[0.22em] text-black/55">
          passion / о бренде
        </p>

        <h1 className="mt-5 text-3xl md:text-5xl font-light tracking-[-0.03em]">
          О бренде
        </h1>
      </Reveal>

      <div className="mt-10 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-7">
          <Reveal delay={0.1}>
            <p className="text-lg md:text-xl leading-relaxed text-black/75">
              Passion — современная косметика для ежедневного ухода. Мы делаем
              продукты, которые приятно использовать каждый день: спокойные
              формулы, мягкие текстуры и чистая эстетика.
            </p>

            <p className="mt-6 text-base leading-relaxed text-black/70">
              Наша идея проста: меньше лишнего — больше ощущения. Уход должен
              работать и не перегружать. Поэтому мы фокусируемся на базовых
              средствах, которые легко встроить в рутину.
            </p>
          </Reveal>
        </div>

        <div className="md:col-span-5">
          <Reveal delay={0.2}>
            <div className="rounded-[28px] border border-black/10 bg-white/35 p-7">
              <div className="text-xs uppercase tracking-[0.22em] text-black/55">
                Принципы
              </div>

              <ul className="mt-5 space-y-4 text-sm text-black/70 leading-relaxed">
                <li>
                  <span className="text-black/80">Тактильность:</span> текстуры,
                  к которым хочется возвращаться.
                </li>
                <li>
                  <span className="text-black/80">Чистота:</span> формулы без
                  лишнего шума и усложнений.
                </li>
                <li>
                  <span className="text-black/80">Ритм:</span> продукты, которые
                  удобно использовать ежедневно.
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
