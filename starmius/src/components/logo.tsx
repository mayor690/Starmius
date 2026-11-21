import Link from "next/link";
import { site } from "@/data/site";

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link href="/" className="flex flex-col items-center leading-none" aria-label={`${site.name} ${site.descriptor} home`}>
      <span className={`${tone === "dark" ? "gold-text" : "gold-text-light"} font-display text-[1.7rem] font-medium tracking-[0.2em]`}>
        {site.name.toUpperCase()}
      </span>
      <span className={`mt-1.5 text-[0.5rem] font-medium tracking-[0.7em] ${tone === "dark" ? "text-champagne-700" : "text-champagne-300"}`}>{site.descriptor.toUpperCase()}</span>
    </Link>
  );
}
