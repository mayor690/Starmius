import { formatNGN, formatUSD } from "@/lib/format";
import type { PricedCart } from "@/lib/pricing";

function Row({ label, ngn, usdc, strong = false }: { label: string; ngn: number; usdc: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={`text-xs uppercase tracking-[0.25em] ${strong ? "text-ink" : "text-muted"}`}>{label}</dt>
      <dd className="text-right">
        <span className={`block font-display ${strong ? "text-2xl" : "text-lg"}`}>{formatNGN(ngn)}</span>
        <span className="block text-xs tracking-wider text-champagne-700">{formatUSD(usdc)}</span>
      </dd>
    </div>
  );
}

export function OrderTotals({ priced }: { priced: PricedCart }) {
  return (
    <dl className="flex flex-col gap-5">
      <Row label="Subtotal" ngn={priced.subtotalNGN} usdc={priced.subtotalUSDC} />
      {!priced.shippingKnown ? (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-xs uppercase tracking-[0.25em] text-muted">Delivery</dt>
          <dd className="text-right text-xs tracking-wider text-muted">Calculated at checkout</dd>
        </div>
      ) : priced.shippingNGN > 0 || priced.shippingUSDC > 0 ? (
        <Row label={priced.shippingZone ? `Delivery (${priced.shippingZone})` : "Delivery"} ngn={priced.shippingNGN} usdc={priced.shippingUSDC} />
      ) : (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-xs uppercase tracking-[0.25em] text-muted">Delivery</dt>
          <dd className="text-right font-display text-lg">Free</dd>
        </div>
      )}
      <div className="border-t border-champagne-300/50 pt-5">
        <Row label="Total" ngn={priced.totalNGN} usdc={priced.totalUSDC} strong />
      </div>
    </dl>
  );
}
