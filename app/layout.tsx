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
      <Link href="/products" className="hover:text-black transition">
        Продукты
      </Link>
      <Link href="/contact" className="hover:text-black transition">
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