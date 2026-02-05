"use client";

import { useEffect, useState } from "react";

export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-black/10 bg-white/70 backdrop-blur-md shadow-sm"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
