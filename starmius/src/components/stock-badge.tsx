import { site } from "@/data/site";
import type { StockStatus } from "@/lib/types";

/** Shows In stock, Only N left, Pre-order or Out of stock. */
export function StockBadge({ status, quantity }: { status: StockStatus; quantity?: number }) {
  const label = status === "low_stock" && typeof quantity === "number" ? `Only ${quantity} left` : site.stockLabels[status];
  const tone = status === "in_stock" ? "text-muted" : status === "out_of_stock" ? "text-ink" : "text-champagne-700";
  return (
    <span className={`inline-flex items-center gap-2 text-[0.66rem] font-medium uppercase tracking-[0.3em] ${tone}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${status === "in_stock" ? "bg-emerald-700" : status === "out_of_stock" ? "bg-red-800" : "bg-champagne-600"}`} />
      {label}
    </span>
  );
}
