"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

type CartContextValue = {
  items: CartItem[];
  total: number;
  count: number;

  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
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

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

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
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
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
      addItem,
      removeItem,
      setQty,
      clearCart,

      drawerOpen,
      openDrawer,
      closeDrawer,
      lastAddedId,
      notifyAdded,
    }),
    [items, total, count, drawerOpen, lastAddedId]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
