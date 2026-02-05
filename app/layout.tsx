import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";
import { StickyHeader } from "@/components/StickyHeader";
import SearchBarClientOnly from "@/components/SearchBarClientOnly";
import MobileSearch from "@/components/MobileSearch";


export const metadata = {
  title: "passion",
  description: "Passion cosmetics — minimal beauty",
};

// Важно: layout — Server Component. Не используем Date.now()/new Date() в разметке.
const CURRENT_YEAR = new Date().getFullYear();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen bg-[#fbf7f3] text-[#141414]">
          <StickyHeader>
            <header className="border-b border-black/10">
              <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-5">
                {/* Навигация */}
                <nav className="flex items-center gap-8 text-[11px] uppercase tracking-[0.22em] text-black/60">
                  <Link
                    href="/"
                    className="relative transition-colors hover:text-black
                               after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full
                               after:origin-left after:scale-x-0 after:bg-black/60
                               after:transition-transform after:duration-300 hover:after:scale-x-100"
                  >
                    Главная
                  </Link>

                  <Link
                    href="/products"
                    className="relative transition-colors hover:text-black
                               after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full
                               after:origin-left after:scale-x-0 after:bg-black/60
                               after:transition-transform after:duration-300 hover:after:scale-x-100"
                  >
                    Продукты
                  </Link>

                  <Link
                    href="/about"
                    className="relative transition-colors hover:text-black
                               after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full
                               after:origin-left after:scale-x-0 after:bg-black/60
                               after:transition-transform after:duration-300 hover:after:scale-x-100"
                  >
                    О бренде
                  </Link>

                  <Link
                    href="/contact"
                    className="relative transition-colors hover:text-black
                               after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full
                               after:origin-left after:scale-x-0 after:bg-black/60
                               after:transition-transform after:duration-300 hover:after:scale-x-100"
                  >
                    Контакты
                  </Link>
                </nav>

                {/* Поиск (справа). На мобиле можно скрыть или сделать компактнее */}
                <div className="hidden md:block w-[320px]">
                  <SearchBarClientOnly className="w-full" />
                </div>
                <div className="flex items-center gap-2">
  {/* mobile search icon */}
  <div className="md:hidden">
    <MobileSearch />
  </div>

  {/* desktop search input */}
  <div className="hidden md:block w-[320px]">
    <SearchBarClientOnly className="w-full" />
  </div>
</div>

              </div>
            </header>
          </StickyHeader>

          <Providers>{children}</Providers>

          <footer className="mx-auto max-w-6xl px-5 py-10 text-xs uppercase tracking-[0.22em] text-black/45">
            © {CURRENT_YEAR} passion
          </footer>
        </div>
      </body>
    </html>
  );
}
