"use client";

import dynamic from "next/dynamic";

const CartButton = dynamic(() => import("@/components/CartButton"), {
  ssr: false,
});

export default function CartButtonClientOnly(props: any) {
  return <CartButton {...props} />;
}
