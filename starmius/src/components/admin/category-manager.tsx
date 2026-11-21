"use client";

import { useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { Category, Product } from "@/lib/types";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function CategoryManager({ categories, products, onChange }: { categories: Category[]; products: Product[]; onChange: (c: Category[]) => void }) {
  const [rows, setRows] = useState<Category[]>(categories);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const count = (id: string) => products.filter((p) => p.categoryId === id).length;
  const patch = (i: number, p: Partial<Category>) => setRows((r) => r.map((x, n) => (n === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => setRows((r) => {
    const j = i + d;
    if (j < 0 || j >= r.length) return r;
    const n = [...r];
    [n[i], n[j]] = [n[j] as Category, n[i] as Category];
    return n;
  });

  function add() {
    let id = "new-category";
    for (let n = 2; rows.some((r) => r.id === id); n++) id = `new-category-${n}`;
    setRows([...rows, { id, name: "" }]);
    setFresh(new Set(fresh).add(id));
  }

  async function save() {
    setBusy(true); setError(""); setNotice("");
    // New categories get their id from the name; saved ones keep theirs so product links stay valid.
    const used = new Set(rows.filter((r) => !fresh.has(r.id)).map((r) => r.id));
    const payload = rows.map((r) => {
      if (!fresh.has(r.id)) return r;
      let id = slugify(r.name) || r.id;
      for (let n = 2; used.has(id); n++) id = `${slugify(r.name)}-${n}`;
      used.add(id);
      return { ...r, id };
    });
    try {
      const res = await adminApi<{ categories: Category[] }>("/api/admin/categories", "PUT", { categories: payload });
      setRows(res.categories); setFresh(new Set()); onChange(res.categories);
      setNotice("Categories saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="cats-title" className="max-w-3xl">
      <h2 id="cats-title" className="font-display text-3xl font-medium">Categories</h2>
      <p className="mt-2 text-sm text-muted">These appear as filters on the Shop page, in the order below.</p>
      <ul className="mt-8 flex flex-col gap-5">
        {rows.map((c, i) => {
          const n = count(c.id);
          return (
            <li key={c.id} className="grid gap-4 border border-champagne-300/60 bg-ivory-50 p-5 sm:grid-cols-[1fr_1.5fr_auto]">
              <div>
                <label htmlFor={`cn-${i}`} className="field-label">Name</label>
                <input id={`cn-${i}`} className="field" value={c.name} onChange={(e) => patch(i, { name: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`cd-${i}`} className="field-label">Description</label>
                <input id={`cd-${i}`} className="field" value={c.description ?? ""} onChange={(e) => patch(i, { description: e.target.value })} />
              </div>
              <div className="flex items-end gap-4 text-xs font-medium uppercase tracking-[0.15em]">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-champagne-700 disabled:opacity-30" aria-label="Move up">&uarr;</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-champagne-700 disabled:opacity-30" aria-label="Move down">&darr;</button>
                <button type="button" disabled={n > 0} title={n > 0 ? `${n} products use this category` : undefined}
                  onClick={() => setRows(rows.filter((_, x) => x !== i))} className="text-red-800 disabled:opacity-30">Delete</button>
              </div>
              {n > 0 && <p className="text-xs text-muted sm:col-span-3">{n} product{n === 1 ? "" : "s"} in this category. Move them before deleting it.</p>}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-6 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-6 text-sm text-champagne-700">{notice}</p>}
      <div className="mt-8 flex flex-wrap gap-4">
        <button type="button" className="btn btn-outline" onClick={add}>Add category</button>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving" : "Save categories"}</button>
      </div>
    </section>
  );
}
