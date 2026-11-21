import Link from "next/link";
import type { Product } from "@/lib/types";
import { getCategory } from "@/lib/products";
import { Price } from "./price";
import { ProductVisual } from "./product-visual";
import { StockBadge } from "./stock-badge";

export async function ProductCard({ product }: { product: Product }) {
  const category = await getCategory(product.categoryId);
  return (
    <article className={`group ${product.stock === "out_of_stock" ? "opacity-80" : ""}`}>
      <ProductVisual product={product} className="aspect-[4/5]" carousel href={`/product/${product.slug}`} />
      <Link href={`/product/${product.slug}`} className="mt-6 flex flex-col items-center gap-2 text-center">
        {category && <p className="eyebrow !text-[0.62rem]">{category.name}</p>}
        <h3 className="font-display text-2xl font-medium">{product.name}</h3>
        <Price priceNGN={product.priceNGN} priceUSDC={product.priceUSDC} />
        <StockBadge status={product.stock} quantity={product.quantity} />
      </Link>
    </article>
  );
}

export function ProductGrid({ products, empty }: { products: Product[]; empty: string }) {
  if (!products.length) return <p className="text-center text-muted">{empty}</p>;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-3 lg:gap-x-10">
      {products.map((p) => <ProductCard key={p.slug} product={p} />)}
    </div>
  );
}
