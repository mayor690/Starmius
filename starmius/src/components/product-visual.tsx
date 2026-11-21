import Image from "next/image";
import type { Product } from "@/lib/types";

export function ProductVisual({ product, className = "", priority = false, sizes = "(min-width: 1024px) 30vw, 50vw" }: { product: Product; className?: string; priority?: boolean; sizes?: string }) {
  const src = product.images[0];
  const soldOut = product.stock === "out_of_stock";
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-ivory-100 via-ivory-200 to-champagne-200/60 ${className}`}>
      {src ? (
        <Image src={src} alt={product.name} fill sizes={sizes} priority={priority} unoptimized={src.startsWith("/media/")} className={`object-cover transition-transform duration-700 group-hover:scale-[1.03] ${soldOut ? "opacity-40 grayscale" : ""}`} />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(233,205,160,0.5),transparent_70%)]" />
          <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="sparkle size-10 text-champagne-500" fill="currentColor">
              <path d="M12 0c.6 6.5 5.5 11.4 12 12-6.5.6-11.4 5.5-12 12-.6-6.5-5.5-11.4-12-12C6.5 11.4 11.4 6.5 12 0z" />
            </svg>
          </span>
        </>
      )}
      {soldOut && (
        <>
          <div className="absolute inset-0 bg-ivory-50/60" aria-hidden="true" />
          <span className="absolute inset-x-0 bottom-6 mx-auto w-fit bg-charcoal-950/90 px-5 py-2 text-[0.65rem] font-medium uppercase tracking-[0.3em] text-ivory-50">Out of stock</span>
        </>
      )}
    </div>
  );
}
