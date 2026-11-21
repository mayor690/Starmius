import type { Metadata } from "next";
import { site } from "@/data/site";
import { CartView } from "@/components/cart-view";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = { title: site.cart.title };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
      <SectionHeading title={site.cart.title} />
      <div className="mt-16"><CartView /></div>
    </div>
  );
}
