import { round2 } from "./format";

/** Delivery fees by location. Edited by the owner in the dashboard; pure so the cart and the server agree. */

export const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

/** Choice shown at checkout for customers outside Nigeria. It always gets the default fee. */
export const OUTSIDE_NIGERIA = "Outside Nigeria";

export interface ShippingZone {
  id: string;
  name: string;
  states: string[];
  feeNGN: number;
  feeUSDC: number;
}

/** A fee for one city or town (or LGA). Beats the state zone and the default. */
export interface CityRule {
  state: string;
  city: string;
  feeNGN: number;
  feeUSDC: number;
}

export interface ShippingConfig {
  /** Fee for any state that is not in a zone, and for "Outside Nigeria". */
  defaultNGN: number;
  defaultUSDC: number;
  zones: ShippingZone[];
  cityRules: CityRule[];
}

export interface ShippingFee {
  ngn: number;
  usdc: number;
  /** Zone or city name, or undefined when the default fee applies. */
  zone?: string;
}

export function shippingFee(cfg: ShippingConfig, state: string | undefined, city?: string): ShippingFee {
  const key = (city ?? "").trim().toLowerCase();
  const rule = state && key ? (cfg.cityRules ?? []).find((r) => r.state === state && r.city.toLowerCase() === key) : undefined;
  if (rule) return { ngn: rule.feeNGN, usdc: round2(rule.feeUSDC), zone: rule.city };
  const zone = state ? cfg.zones.find((z) => z.states.includes(state)) : undefined;
  if (zone) return { ngn: zone.feeNGN, usdc: round2(zone.feeUSDC), zone: zone.name };
  return { ngn: cfg.defaultNGN, usdc: round2(cfg.defaultUSDC) };
}
