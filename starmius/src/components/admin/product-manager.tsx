"use client";

import { useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { formatNGN, formatUSDC } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { ProductForm } from "./product-form";

const STOCK: Record<string, string> = { in_stock: "In stock", low_stock: "Low stock", preorder: "Pre-order", out_of_stock: "Out of stock" };

export function ProductManager({ products, categories, onChange }: { products: Product[]; categories: Category[]; onChange: (p: Product[]) => void }) {
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  async function remove(p: Product) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await adminApi(`/api/admin/products?slug=${encodeURIComponent(p.slug)}`, "DELETE");
      onChange(products.filter((x) => x.slug !== p.slug));
      setNotice(`Deleted ${p.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  function saved(p: Product, original?: string) {
    const from = original ?? p.slug;
    onChange(products.some((x) => x.slug === from) ? products.map((x) => (x.slug === from ? p : x)) : [...products, p]);
    setNotice(`Saved ${p.name}. It is live on the shop now.`);
    setEditing(null);
  }

  if (editing) {
    return <ProductForm product={editing === "new" ? null : editing} categories={categories} onSaved={saved} onCancel={() => setEditing(null)} />;
  }

  return (
    <section aria-labelledby="products-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="products-title" className="font-display text-3xl font-medium">{products.length} products</h2>
        <button type="button" className="btn btn-primary" onClick={() => { setNotice(""); setEditing("new"); }} disabled={!categories.length}>Add product</button>
      </div>
      {!categories.length && <p className="mt-4 text-sm text-muted">Create a category first.</p>}
      {notice && <p role="status" className="mt-4 text-sm text-champagne-700">{notice}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}

      <ul className="mt-8 divide-y divide-champagne-300/50 border-y border-champagne-300/50 bg-ivory-50">
        {products.map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center gap-5 px-4 py-4">
            <div className="size-16 shrink-0 overflow-hidden border border-champagne-300/60 bg-ivory-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.images[0] && <img src={p.images[0]} alt="" className="size-full object-cover" />}
            </div>
            <div className="min-w-48 flex-1">
              <p className="font-display text-xl font-medium">{p.name}</p>
              <p className="text-xs tracking-wider text-muted">{catName(p.categoryId)} &middot; {STOCK[p.stock]}{typeof p.quantity === "number" ? ` (${p.quantity} left)` : ""}{p.featured ? " \u00b7 Featured" : ""}</p>
            </div>
            <p className="text-sm">{formatNGN(p.priceNGN)} <span className="text-champagne-700">/ {formatUSDC(p.priceUSDC)}</span></p>
            <div className="flex gap-5 text-xs font-medium uppercase tracking-[0.2em]">
              <button type="button" className="text-champagne-700 hover:text-ink" onClick={() => { setNotice(""); setEditing(p); }}>Edit</button>
              <button type="button" className="text-red-800 hover:text-red-950" onClick={() => void remove(p)}>Delete</button>
            </div>
          </li>
        ))}
        {!products.length && <li className="px-4 py-10 text-center text-muted">No products yet.</li>}
      </ul>
    </section>
  );
}
