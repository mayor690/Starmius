import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, getProduct, getRelatedProducts } from "@/lib/products";
import { site } from "@/data/site";
import { AddToCart } from "@/components/add-to-cart";
import { Price } from "@/components/price";
import { ProductGrid } from "@/components/product-card";
import { ProductVisual } from "@/components/product-visual";
import { StockBadge } from "@/components/stock-badge";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  return p ? { title: p.name, description: p.tagline } : {};
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const category = await getCategory(product.categoryId);
  const related = await getRelatedProducts(product);
  const details = [
    { title: "Benefits", body: product.benefits?.length ? <ul className="list-disc space-y-1 pl-5">{product.benefits.map((b) => <li key={b}>{b}</li>)}</ul> : null },
    { title: "How to use", body: product.howToUse ? <p>{product.howToUse}</p> : null },
    { title: "Ingredients", body: product.ingredients ? <p>{product.ingredients}</p> : null },
  ].filter((d) => d.body);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
      <nav aria-label="Breadcrumb" className="mb-10 text-xs uppercase tracking-[0.25em] text-muted">
        <Link href="/shop" className="hover:text-ink">{site.shop.title}</Link>
        {category && (<> <span aria-hidden="true">/</span> <Link href={`/shop?category=${category.id}`} className="hover:text-ink">{category.name}</Link></>)}
      </nav>

      <div className="grid gap-14 lg:grid-cols-2 lg:gap-24">
        <div className="group">
          <ProductVisual product={product} className="aspect-[4/5]" priority sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
        <div className="flex flex-col gap-8 lg:py-6">
          <div className="flex flex-col gap-4">
            {category && <p className="eyebrow">{category.name}</p>}
            <h1 className="font-display text-5xl font-medium leading-tight">{product.name}</h1>
            <p className="text-champagne-700">{product.tagline}</p>
          </div>
          <Price priceNGN={product.priceNGN} priceUSDC={product.priceUSDC} size="lg" align="left" />
          <div className="flex items-center gap-4">
            <StockBadge status={product.stock} quantity={product.quantity} />
            {product.size && <span className="text-xs tracking-wider text-muted">{product.size}</span>}
          </div>
          <p className="max-w-lg leading-relaxed text-muted">{product.description}</p>
          <AddToCart product={product} />
          <div className="mt-4 border-t border-champagne-300/50">
            {details.map((d) => (
              <details key={d.title} className="group border-b border-champagne-300/50 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.3em] [&::-webkit-details-marker]:hidden">
                  {d.title}<span className="text-champagne-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <div className="mt-4 text-sm leading-relaxed text-muted">{d.body}</div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-32">
          <h2 className="mb-14 text-center font-display text-3xl font-medium">You may also like</h2>
          <ProductGrid products={related} empty="" />
        </section>
      )}
    </div>
  );
}
