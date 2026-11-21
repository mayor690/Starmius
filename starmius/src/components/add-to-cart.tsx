"use client";

import Link from "next/link";
import { useState } from "react";
import { site } from "@/data/site";
import { isPurchasable } from "@/lib/stock";
import { track } from "@/lib/track";
import type { Product } from "@/lib/types";
import { useCart } from "./cart-provider";
import { QtyStepper } from "./qty-stepper";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const available = isPurchasable(product.stock);
  const max = typeof product.quantity === "number" ? Math.max(1, Math.min(site.maxQty, product.quantity)) : site.maxQty;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-5">
        {available && <QtyStepper value={qty} max={max} onChange={(n) => setQty(Math.min(Math.max(n, 1), max))} label="Quantity" />}
        <button type="button" className="btn btn-primary flex-1 sm:flex-none" disabled={!available}
          onClick={() => { add(product.slug, qty); track({ t: "atc" }); setAdded(true); window.setTimeout(() => setAdded(false), 2500); }}>
          {available ? (product.stock === "preorder" ? "Pre-order" : "Add to cart") : site.stockLabels.out_of_stock}
        </button>
      </div>
      <p className="h-5 text-sm text-champagne-700" role="status">
        {added && (<>Added to your cart. <Link href="/cart" className="underline underline-offset-4">View cart</Link></>)}
      </p>
    </div>
  );
}
