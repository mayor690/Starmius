import type { SocialLink } from "@/lib/types";

/**
 * Add a social: append an object. Remove: delete it. Reorder: move it.
 * Verify each URL points to your real profile. Icons: x, telegram, instagram,
 * facebook, tiktok, whatsapp, youtube (add more in components/icons.tsx).
 */
export const socials: SocialLink[] = [
  { id: "x", label: "X", handle: "@starmius_sc", url: "https://x.com/starmius_sc", icon: "x" },
  { id: "telegram", label: "Telegram", handle: "@starmius_sc", url: "https://t.me/starmius_sc", icon: "telegram" },
  { id: "instagram", label: "Instagram", handle: "@starmius_sc", url: "https://instagram.com/starmius_sc", icon: "instagram" },
  { id: "facebook", label: "Facebook", handle: "@starmius_sc", url: "https://facebook.com/starmius_sc", icon: "facebook" },
  { id: "tiktok", label: "TikTok", handle: "@starmius_sc", url: "https://tiktok.com/@starmius_sc", icon: "tiktok" },
  { id: "whatsapp", label: "WhatsApp", handle: "+2347066100892", url: "https://wa.me/2347066100892", icon: "whatsapp" },
];
