export interface CheckoutField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "state" | "city";
  required: boolean;
  autoComplete?: string;
  half?: boolean;
}

export const checkoutConfig = {
  title: "Checkout",
  fields: [
    { name: "fullName", label: "Full name", type: "text", required: true, autoComplete: "name" },
    { name: "email", label: "Email", type: "email", required: true, autoComplete: "email", half: true },
    { name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel", half: true },
    { name: "address", label: "Delivery address", type: "text", required: true, autoComplete: "street-address" },
    { name: "city", label: "City / Town", type: "city", required: true, autoComplete: "address-level2", half: true },
    { name: "state", label: "State", type: "state", required: true, autoComplete: "address-level1", half: true },
    { name: "notes", label: "Notes (optional)", type: "textarea", required: false },
  ] satisfies CheckoutField[],
  usdcSteps: [
    "Send the exact USDC amount to the address below on the chain you selected.",
    "Paste your transaction hash.",
    "Confirm on WhatsApp so we can verify and prepare your order.",
  ],
  success: {
    title: "Thank you",
    body: "Your payment was received. We will contact you shortly about delivery.",
    cta: { label: "Continue shopping", href: "/shop" },
  },
  pending: {
    title: "Almost done",
    body: "We have your USDC order details. Once we verify the transaction on chain, we will confirm your order.",
    cta: { label: "Continue shopping", href: "/shop" },
  },
  failure: {
    title: "Payment not completed",
    body: "We could not confirm this payment. Please try again or contact us.",
    cta: { label: "Return to cart", href: "/cart" },
  },
};
