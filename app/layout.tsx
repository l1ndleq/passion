import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import AppProviders from "./providers";
import { StickyHeader } from "@/components/StickyHeader";
import SearchBarClientOnly from "@/components/SearchBarClientOnly";
import MobileSearchClientOnly from "@/components/MobileSearchClientOnly";
import MobileMenu from "@/components/MobileMenu";
import CartLinkClientOnly from "@/components/CartLinkClientOnly";
import { Inter, Cormorant_Garamond } from "next/font/google";
import MiniCartDrawer from "@/components/MiniCartDrawer";


const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata = {
  title: "passion",
  description: "Passion — современная косметика для ежедневного ухода",
};

const NAV_LINK =
  "text-[11px] uppercase tracking-[0.22em] text-black/60 " +
  "relative transition-colors hover:text-black " +
  "after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full " +
  "after:origin-left after:scale-x-0 after:bg-black/60 " +
  "after:transition-transform after:duration-300 hover:after:scale-x-100";

const CURRENT_YEAR = new Date().getFullYear();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        <AppProviders>
          <div className="min-h-screen bg-[#fbf7f3] text-[#141414]">
            <StickyHeader>
              <header className="border-b border-black/10 bg-white/60 backdrop-blur">
                <div className="mx-auto flex h-12 max-w-6xl items-center px-5 relative">
                  {/* MOBILE LEFT: burger */}
                  <div className="md:hidden">
                    <MobileMenu />
                  </div>

                  {/* DESKTOP NAV (как было) */}
                  <nav className="hidden md:flex shrink-0 items-center gap-8 text-[11px] uppercase tracking-[0.22em] text-black/60">
                    <Link href="/" className={NAV_LINK}>
                      Главная
                    </Link>

                    <Link href="/products" className={NAV_LINK}>
                      Каталог
                    </Link>

                    <Link href="/contact" className={NAV_LINK}>
                      Контакты
                    </Link>

                    <CartLinkClientOnly className={NAV_LINK} variant="text" />

                    <Link href="/account" className={NAV_LINK} aria-label="Кабинет">
                      <span className="inline-block">Кабинет</span>
                    </Link>
                  </nav>

                  {/* MOBILE CENTER LOGO (ТОЛЬКО МОБИЛА) */}
                  <div className="md:hidden absolute left-1/2 -translate-x-1/2">
                    <Link href="/" aria-label="На главную" className="inline-flex min-h-[44px] items-center">
                      {/* если у тебя лого не /logo.png — поменяй путь */}
                      <Image
  src="/brand/logo.png"

                        alt="Passion"
                        width={110}
                        height={22}
                        priority
                        className="h-[18px] w-auto opacity-90"
                      />
                    </Link>
                  </div>

                  {/* SPACER */}
                  <div className="flex-1" />

                  {/* DESKTOP SEARCH (как было) */}
                  <div className="hidden md:flex w-[560px] max-w-[50%]">
                    <SearchBarClientOnly className="w-full" />
                  </div>

                  {/* MOBILE RIGHT: cart icon + search */}
                  <div className="md:hidden ml-auto flex items-center gap-1">
                    <CartLinkClientOnly variant="icon" />
                    <MobileSearchClientOnly />
                  </div>
                </div>
              </header>
            </StickyHeader>
            <MiniCartDrawer />

            {children}

            <footer className="mx-auto max-w-6xl px-5 py-10 text-xs uppercase tracking-[0.22em] text-black/45">
              © {CURRENT_YEAR} passion
            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
