/** Adds or removes UTM tracking tags on an advertiser's https link, keeping any other query parameters. */

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

export const slugTag = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

export interface UtmTags { source: string; medium: string; campaign: string; content?: string }

/** Returns the tagged link, or null when the link is not a valid https:// address. */
export function addUtm(href: string, tags: UtmTags): string | null {
  let u: URL;
  try { u = new URL(href.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  for (const k of KEYS) u.searchParams.delete(k);
  const set = (k: (typeof KEYS)[number], v: string | undefined) => { const t = slugTag(v ?? ""); if (t) u.searchParams.set(k, t); };
  set("utm_source", tags.source);
  set("utm_medium", tags.medium);
  set("utm_campaign", tags.campaign);
  set("utm_content", tags.content);
  return u.toString();
}

export function removeUtm(href: string): string {
  try {
    const u = new URL(href.trim());
    for (const k of KEYS) u.searchParams.delete(k);
    return u.toString();
  } catch { return href; }
}

export const hasUtm = (href: string): boolean => {
  try { const u = new URL(href); return KEYS.some((k) => u.searchParams.has(k)); } catch { return false; }
};
