// components/NavItem.tsx
"use client";

import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
};

export default function NavItem({ href, onClick, children }: Props) {
  const className =
    "group relative text-sm tracking-[0.2em] uppercase text-neutral-500 hover:text-neutral-900 transition";

  const underline = (
    <span className="absolute left-0 -bottom-1 h-px w-full scale-x-0 bg-neutral-900 transition-transform duration-300 group-hover:scale-x-100" />
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
        {underline}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
      {underline}
    </button>
  );
}
