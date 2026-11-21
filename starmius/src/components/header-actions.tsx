"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import { Icon } from "./icons";

export function HeaderActions() {
  const { count, hydrated } = useCart();
  return (
    <div className="flex items-center gap-5">
      <Link href="/account" aria-label="Account" className="text-ivory-100 transition-colors hover:text-champagne-300">
        <Icon name="user" className="size-5" />
      </Link>
      <Link href="/cart" aria-label={`Cart${hydrated && count ? `, ${count} items` : ""}`} className="relative text-ivory-100 transition-colors hover:text-champagne-300">
        <Icon name="bag" className="size-5" />
        {hydrated && count > 0 && (
          <span className="absolute -right-2.5 -top-2 grid size-4 place-items-center rounded-full bg-champagne-400 text-[0.6rem] font-medium text-charcoal-950">{count}</span>
        )}
      </Link>
    </div>
  );
}
