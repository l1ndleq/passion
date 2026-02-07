"use client";

import AddToCartButton from "@/components/add-to-cart-button";

export function ProductCard({
  product,
}: {
  product: { id: string; title: string; price: number; description?: string };
}) {
  return (
    <div className="border rounded-2xl p-5 bg-white/40">
      <div className="text-lg font-medium">{product.title}</div>
      {product.description && (
        <div className="mt-2 text-sm opacity-70">{product.description}</div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm font-semibold">{product.price} ₽</div>
        <AddToCartButton
          product={{ id: product.id, title: product.title, price: product.price }}
        />
      </div>
    </div>
  );
}