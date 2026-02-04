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
          <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-[#fbf7f3]/70 bg-[#fbf7f3]/90 border-b border-black/5">
            <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center">
                <Image
                  src="/brand/logo.jpg"
                  alt="PASSION"
                  width={120}
                  height={32}
                  priority
                  />
                </Link>

              <nav className="flex items-center gap-5 text-xs tracking-wide uppercase text-black/70">
                <Link className="hover:text-black transition" href="/about">
                  О бренде
                </Link>
                <Link className="hover:text-black transition" href="/products">
                  Продукты
                </Link>
                <Link className="hover:text-black transition" href="/contact">
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