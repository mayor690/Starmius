import type { Metadata } from "next";
import { checkoutConfig } from "@/data/checkout";
import { CheckoutForm } from "@/components/checkout-form";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = { title: checkoutConfig.title };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
      <SectionHeading title={checkoutConfig.title} />
      <div className="mt-16"><CheckoutForm /></div>
    </div>
  );
}
