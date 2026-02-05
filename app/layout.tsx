import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { Providers } from "./providers";

export const metadata = {
  title: "passion",
  description: "Passion cosmetics — minimal beauty",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        
        <div className="min-h-screen bg-[#fbf7f3] text-[#141414]">
   <header className="border-b border-black/10">
  <div className="mx-auto max-w-6xl px-5 h-12 flex items-center justify-center">
    <nav className="flex items-center gap-8 text-[11px] uppercase tracking-[0.22em] text-black/60">
      <Link href="/about" className="hover:text-black transition">
        О бренде
      </Link>
      <Link href="/products" className="relative text-[11px] uppercase tracking-[0.22em] text-black/60 transition-colors hover:text-black
after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-black/60 after:transition-transform after:duration-300 hover:after:scale-x-100">
        Продукты
      </Link>
      <Link href="/contact" className="relative text-[11px] uppercase tracking-[0.22em] text-black/60 transition-colors hover:text-black
after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-black/60 after:transition-transform after:duration-300 hover:after:scale-x-100">
        Контакты
      </Link>
    </nav>
  </div>
</header>

          <Providers>{children}</Providers>

          <footer className="mx-auto max-w-6xl px-5 py-10 text-xs uppercase tracking-[0.22em] text-black/45">
            © {new Date().getFullYear()} passion
          </footer>
        </div>
      </body>
    </html>
  );
}