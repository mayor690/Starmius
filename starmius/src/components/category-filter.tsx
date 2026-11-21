import Link from "next/link";
import { getCategories } from "@/lib/products";
import { site } from "@/data/site";

export async function CategoryFilter({ active }: { active?: string }) {
  const items = [{ id: "", name: site.shop.allLabel }, ...(await getCategories())];
  return (
    <nav aria-label="Categories" className="flex flex-wrap justify-center gap-x-10 gap-y-4">
      {items.map((c) => {
        const isActive = (active ?? "") === c.id;
        return (
          <Link key={c.id || "all"} href={c.id ? `/shop?category=${c.id}` : "/shop"} aria-current={isActive ? "page" : undefined}
            className={`border-b pb-1 text-xs uppercase tracking-[0.3em] transition-colors ${isActive ? "border-champagne-600 text-champagne-700" : "border-transparent text-muted hover:text-ink"}`}>
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
