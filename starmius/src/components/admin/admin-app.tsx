"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { Category, Product, SiteSettings } from "@/lib/types";
import { CategoryManager } from "./category-manager";
import { ProductManager } from "./product-manager";
import { SiteSettingsForm } from "./site-settings-form";

type Tab = "products" | "categories" | "site";
const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "site", label: "Settings" },
];

export function AdminApp({ initialProducts, initialCategories, initialSettings }: { initialProducts: Product[]; initialCategories: Category[]; initialSettings: SiteSettings }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);

  async function signOut() {
    await adminApi("/api/admin/session", "DELETE").catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-champagne-300/60 pb-6">
        <div>
          <p className="gold-text font-display text-3xl font-medium tracking-[0.2em]">STARMIUS</p>
          <p className="eyebrow mt-2">Owner dashboard</p>
        </div>
        <div className="flex items-center gap-6 text-xs uppercase tracking-[0.25em]">
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-champagne-700 hover:text-ink">View shop</a>
          <button type="button" onClick={() => void signOut()} className="text-muted hover:text-ink">Sign out</button>
        </div>
      </header>

      <nav aria-label="Dashboard sections" className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}
            className={`border-b pb-1 text-xs font-medium uppercase tracking-[0.3em] transition-colors ${tab === t.id ? "border-champagne-600 text-champagne-700" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-10">
        {tab === "products" && <ProductManager products={products} categories={categories} onChange={setProducts} />}
        {tab === "categories" && <CategoryManager categories={categories} products={products} onChange={setCategories} />}
        {tab === "site" && <SiteSettingsForm initial={initialSettings} />}
      </div>
    </div>
  );
}
