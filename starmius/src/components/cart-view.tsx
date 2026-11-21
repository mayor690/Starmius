"use client";

import Link from "next/link";
import { site } from "@/data/site";
import { useCart } from "./cart-provider";
import { Price } from "./price";
import { ProductVisual } from "./product-visual";
import { QtyStepper } from "./qty-stepper";
import { OrderTotals } from "./order-totals";

export function CartView() {
  const { priced, lines, hydrated, setQty, remove } = useCart();

  if (!hydrated) return <p className="py-24 text-center text-muted">Loading</p>;

  if (!priced.items.length) {
    return (
      <div className="flex flex-col items-center gap-8 py-24 text-center">
        <p className="text-muted">{site.cart.empty}</p>
        <Link href="/shop" className="btn btn-outline">{site.cart.continue}</Link>
      </div>
    );
  }

  const staleCount = lines.length - priced.items.length;

  return (
    <div className="grid gap-16 lg:grid-cols-[1.6fr_1fr]">
      <ul className="divide-y divide-champagne-300/40 border-y border-champagne-300/40">
        {priced.items.map(({ product, qty }) => (
          <li key={product.slug} className="flex gap-5 py-8">
            <Link href={`/product/${product.slug}`} className="group block w-24 shrink-0 sm:w-32">
              <ProductVisual product={product} className="aspect-[4/5]" sizes="128px" />
            </Link>
            <div className="flex flex-1 flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/product/${product.slug}`} className="font-display text-2xl font-medium">{product.name}</Link>
                  {product.size && <p className="mt-1 text-xs tracking-wider text-muted">{product.size}</p>}
                </div>
                <Price priceNGN={product.priceNGN} priceUSDC={product.priceUSDC} align="right" />
              </div>
              <div className="flex items-center justify-between">
                <QtyStepper value={qty} max={typeof product.quantity === "number" ? Math.max(1, Math.min(site.maxQty, product.quantity)) : site.maxQty} onChange={(n) => setQty(product.slug, n)} label={`Quantity for ${product.name}`} />
                <button type="button" onClick={() => remove(product.slug)} className="text-xs uppercase tracking-[0.25em] text-muted transition-colors hover:text-ink">Remove</button>
              </div>
            </div>
          </li>
        ))}
        {staleCount > 0 && <li className="py-4 text-sm text-muted">Some items are no longer available and were left out.</li>}
      </ul>

      <aside className="h-fit border border-champagne-300/50 bg-ivory-100/60 p-8">
        <OrderTotals priced={priced} />
        <Link href="/checkout" className="btn btn-primary mt-8 w-full">Checkout</Link>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted">{site.shipping.note}</p>
      </aside>
    </div>
  );
}
