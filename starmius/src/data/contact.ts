import type { ContactChannel } from "@/lib/types";

/** Single source of truth for the phone number. Always shown exactly like this. Do not reformat. */
export const PHONE = "+2347066100892";

export const contact = {
  brandHandle: "@starmius_sc  |  @starmius",
  /** Add, remove or reorder channels freely. `icon` keys live in components/icons.tsx. */
  channels: [
    { id: "phone", label: "Phone", value: PHONE, href: `tel:${PHONE}`, icon: "phone" },
    // Replace with the real address:
    { id: "email", label: "Email", value: "hello@starmius.com", href: "mailto:hello@starmius.com", icon: "mail" },
  ] satisfies ContactChannel[],
  /** Set to null to hide. */
  address: null as { label: string; lines: string[] } | null,
  /** Example: { label: "Hours", lines: ["Monday to Saturday, 9:00 AM to 6:00 PM"] } */
  hours: null as { label: string; lines: string[] } | null,
};
