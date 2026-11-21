"use client";

import { useState, type FormEvent } from "react";
import { adminApi } from "@/lib/admin-api";
import { STOCK_STATUSES } from "@/lib/stock";
import type { Category, Product } from "@/lib/types";
import { ImageUploader } from "./image-uploader";

const STOCK_LABELS: Record<string, string> = { in_stock: "In stock", low_stock: "Low stock", preorder: "Pre-order", out_of_stock: "Out of stock" };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function ProductForm({ product, categories, onSaved, onCancel }: { product: Product | null; categories: Category[]; onSaved: (p: Product, originalSlug?: string) => void; onCancel: () => void }) {
  const isNew = product === null;
  const [f, setF] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    tagline: product?.tagline ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    priceNGN: String(product?.priceNGN ?? ""),
    priceUSDC: String(product?.priceUSDC ?? ""),
    stock: product?.stock ?? "in_stock",
    quantity: product?.quantity === undefined ? "" : String(product.quantity),
    size: product?.size ?? "",
    featured: product?.featured ?? false,
    benefits: (product?.benefits ?? []).join("\n"),
    ingredients: product?.ingredients ?? "",
    howToUse: product?.howToUse ?? "",
    images: product?.images ?? [],
  });
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...f, benefits: f.benefits.split("\n") };
      const res = await adminApi<{ product: Product }>("/api/admin/products", "PUT", { product: payload, originalSlug: product?.slug });
      onSaved(res.product, product?.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  const text = (id: keyof typeof f, label: string, opts: { type?: string; required?: boolean; hint?: string } = {}) => (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} type={opts.type ?? "text"} required={opts.required} step={opts.type === "number" ? "any" : undefined} className="field" value={String(f[id])} onChange={(e) => set(id, e.target.value as never)} />
      {opts.hint && <p className="mt-1 text-xs text-muted">{opts.hint}</p>}
    </div>
  );
  const area = (id: "description" | "benefits" | "ingredients" | "howToUse", label: string, rows: number, hint?: string) => (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="field-label">{label}</label>
      <textarea id={id} rows={rows} className="field resize-y" value={f[id]} onChange={(e) => set(id, e.target.value)} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="border border-champagne-300/60 bg-ivory-50 p-8">
      <h2 className="font-display text-3xl font-medium">{isNew ? "Add product" : `Edit ${product.name}`}</h2>
      <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="field-label">Name</label>
          <input id="name" required className="field" value={f.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
        </div>
        <div>
          <label htmlFor="slug" className="field-label">Web address (slug)</label>
          <input id="slug" required className="field" value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
          <p className="mt-1 text-xs text-muted">Changing it changes the product link, and removes it from carts that already hold it.</p>
        </div>
        <div className="sm:col-span-2">{text("tagline", "Short tagline")}</div>
        {area("description", "Description", 4)}
        <div>
          <label htmlFor="categoryId" className="field-label">Category</label>
          <select id="categoryId" className="field" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="stock" className="field-label">Stock</label>
          <select id="stock" className="field" value={f.stock} onChange={(e) => set("stock", e.target.value as Product["stock"])}>
            {STOCK_STATUSES.map((s) => <option key={s} value={s}>{STOCK_LABELS[s]}</option>)}
          </select>
        </div>
        {text("quantity", "Items left (optional)", { type: "number", hint: "Leave empty to not count. 0 marks it out of stock. A low count shows \"Only N left\"." })}
        {text("priceNGN", "Price (NGN)", { type: "number", required: true, hint: "Whole naira, e.g. 18000" })}
        {text("priceUSDC", "Price (USDC)", { type: "number", required: true, hint: "e.g. 12 or 12.50" })}
        {text("size", "Size (optional)", { hint: "e.g. 50 ml" })}
        <label className="flex items-center gap-3 self-end pb-2 text-sm">
          <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="size-4 accent-[#6b4f2a]" />
          Show on the home page
        </label>
        {area("benefits", "Benefits (optional)", 3, "One per line.")}
        {area("howToUse", "How to use (optional)", 2)}
        {area("ingredients", "Ingredients (optional)", 3)}
        <div className="sm:col-span-2"><ImageUploader images={f.images} onChange={(v) => set("images", v)} /></div>
      </div>
      {error && <p role="alert" className="mt-6 text-sm text-red-800">{error}</p>}
      <div className="mt-8 flex flex-wrap gap-4">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving" : "Save product"}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
