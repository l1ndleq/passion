"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

function normalizePromoCode(raw: string) {
  const code = String(raw || "").trim().toUpperCase();
  if (!code) return "";
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return "";
  return code;
}

type CartContextValue = {
  items: CartItem[];
  total: number;
  count: number;
  promoCode: string | null;

  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  setPromoCode: (code: string | null) => void;
  clearCart: () => void;

  // ✅ mini-cart drawer
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  lastAddedId: string | null;
  notifyAdded: (id: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const LS_KEY = "passion_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCodeState] = useState<string | null>(null);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setItems(parsed);
        setPromoCodeState(null);
        return;
      }
      if (parsed && typeof parsed === "object") {
        const nextItems = Array.isArray((parsed as { items?: unknown }).items)
          ? ((parsed as { items: CartItem[] }).items || [])
          : [];
        const nextPromo = normalizePromoCode(
          String((parsed as { promoCode?: string | null }).promoCode || "")
        );
        setItems(nextItems);
        setPromoCodeState(nextPromo || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          items,
          promoCode: promoCode || null,
        })
      );
    } catch {}
  }, [items, promoCode]);

  const addItem: CartContextValue["addItem"] = (item, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === item.id);
      if (i === -1) return [...prev, { ...item, qty }];
      const copy = [...prev];
      copy[i] = { ...copy[i], qty: copy[i].qty + qty };
      return copy;
    });
  };

  const removeItem: CartContextValue["removeItem"] = (id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const setQty: CartContextValue["setQty"] = (id, qty) => {
    setItems((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const clearCart = () => {
    setItems([]);
    setPromoCodeState(null);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  };

  const setPromoCode: CartContextValue["setPromoCode"] = (code) => {
    const next = normalizePromoCode(String(code || ""));
    setPromoCodeState(next || null);
  };

  const total = useMemo(() => items.reduce((s, x) => s + x.price * x.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  const notifyAdded = (id: string) => {
    setLastAddedId(id);
    setDrawerOpen(true);
  };

  const value: CartContextValue = useMemo(
    () => ({
      items,
      total,
      count,
      promoCode,
      addItem,
      removeItem,
      setQty,
      setPromoCode,
      clearCart,

      drawerOpen,
      openDrawer,
      closeDrawer,
      lastAddedId,
      notifyAdded,
    }),
    [items, total, count, promoCode, drawerOpen, lastAddedId]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
