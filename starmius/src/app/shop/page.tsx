import type { Metadata } from "next";
import { site } from "@/data/site";
import { getCategories, getProductsByCategory } from "@/lib/products";
import { BannerSlot } from "@/components/banner-slot";
import { CategoryFilter } from "@/components/category-filter";
import { ProductGrid } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = { title: site.shop.title, description: site.shop.intro };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const active = (await getCategories()).find((c) => c.id === category);
  const list = await getProductsByCategory(active?.id);

  return (
    <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
      <SectionHeading eyebrow={site.shop.eyebrow} title={active?.name ?? site.shop.title} intro={active?.description ?? site.shop.intro} />
      <div className="mb-20 mt-16"><CategoryFilter active={active?.id} /></div>
      <BannerSlot placement="shop" className="mb-16" />
      <ProductGrid products={list} empty={site.shop.empty} />
    </div>
  );
}
