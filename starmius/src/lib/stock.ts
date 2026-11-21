import type { Product, StockStatus } from "./types";

export const STOCK_STATUSES: StockStatus[] = ["in_stock", "low_stock", "preorder", "out_of_stock"];
export const DEFAULT_LOW_STOCK = 5;

export const isPurchasable = (s: StockStatus) => s !== "out_of_stock";

/** The status customers see: an item count of 0 means sold out, and a low count means low stock. */
export function effectiveStock(p: Pick<Product, "stock" | "quantity">, threshold: number = DEFAULT_LOW_STOCK): StockStatus {
  if (p.stock === "out_of_stock") return p.stock;
  if (typeof p.quantity === "number") {
    if (p.quantity <= 0) return "out_of_stock";
    if (p.stock === "in_stock" && p.quantity <= threshold) return "low_stock";
  }
  return p.stock;
}
