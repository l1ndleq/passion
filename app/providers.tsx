"use client";

import { CartProvider } from "./cart-context";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CartProvider>{children}</CartProvider>;
}
