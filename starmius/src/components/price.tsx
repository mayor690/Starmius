import { formatNGN, formatUSD } from "@/lib/format";

export function Price({ priceNGN, priceUSDC, size = "sm", align = "center" }: { priceNGN: number; priceUSDC: number; size?: "sm" | "lg"; align?: "center" | "left" | "right" }) {
  const al = align === "center" ? "items-center" : align === "right" ? "items-end" : "items-start";
  return (
    <p className={`flex flex-col gap-0.5 ${al}`}>
      <span className={`font-display ${size === "lg" ? "text-3xl" : "text-xl"} text-ink`}>{formatNGN(priceNGN)}</span>
      <span className={`${size === "lg" ? "text-sm" : "text-xs"} tracking-wider text-champagne-700`}>{formatUSD(priceUSDC)}</span>
    </p>
  );
}
