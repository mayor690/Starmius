"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { site } from "@/data/site";
import { priceCart, type CartLine, type PricedCart } from "@/lib/pricing";
import { useCatalog } from "./catalog-provider";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  priced: PricedCart;
  hydrated: boolean;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const clamp = (n: number) => Math.min(Math.max(Math.floor(n), 1), site.maxQty);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, shipping } = useCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(site.cartStorageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setLines(
          parsed.filter((l): l is CartLine => typeof l?.slug === "string" && typeof l?.qty === "number").map((l) => ({ slug: l.slug, qty: clamp(l.qty) })),
        );
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(site.cartStorageKey, JSON.stringify(lines));
    } catch {
      /* storage unavailable */
    }
  }, [lines, hydrated]);

  const add = useCallback((slug: string, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === slug);
      if (existing) return prev.map((l) => (l.slug === slug ? { ...l, qty: clamp(l.qty + qty) } : l));
      return [...prev, { slug, qty: clamp(qty) }];
    });
  }, []);
  const setQty = useCallback((slug: string, qty: number) => setLines((p) => p.map((l) => (l.slug === slug ? { ...l, qty: clamp(qty) } : l))), []);
  const remove = useCallback((slug: string) => setLines((p) => p.filter((l) => l.slug !== slug)), []);
  const clear = useCallback(() => setLines([]), []);

  const priced = useMemo(() => priceCart(lines, products, shipping), [lines, products, shipping]);
  const count = useMemo(() => priced.items.reduce((s, i) => s + i.qty, 0), [priced]);

  const value = useMemo(() => ({ lines, count, priced, hydrated, add, setQty, remove, clear }), [lines, count, priced, hydrated, add, setQty, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
