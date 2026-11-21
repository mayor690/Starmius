"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ShippingConfig } from "@/lib/shipping";
import type { Product } from "@/lib/types";

interface CatalogValue {
  products: Product[];
  /** Business WhatsApp link (no text), e.g. https://wa.me/234... */
  whatsappBase: string | null;
  shipping: ShippingConfig;
  /** Milliseconds between carousel pictures. 0 means no auto-advance. */
  carouselMs: number;
}

const CatalogContext = createContext<CatalogValue>({ products: [], whatsappBase: null, shipping: { defaultNGN: 0, defaultUSDC: 0, zones: [], cityRules: [] }, carouselMs: 5000 });

export function CatalogProvider({ products, whatsappBase, shipping, carouselMs, children }: CatalogValue & { children: ReactNode }) {
  return <CatalogContext.Provider value={{ products, whatsappBase, shipping, carouselMs }}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
