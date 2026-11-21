import { getActiveBanners } from "@/lib/store";
import type { BannerPlacement } from "@/lib/types";
import { BannerPopup } from "./banner-popup";
import { TopBar } from "./top-bar";
import { TrackedBanner } from "./tracked-banner";

/** Renders the live banners for one place on the storefront. The top bar shows only the first. */
export async function BannerSlot({ placement, className = "" }: { placement: BannerPlacement; className?: string }) {
  const list = (await getActiveBanners()).filter((b) => b.placement === placement);
  if (placement === "popup") return list[0] ? <BannerPopup banner={list[0]} /> : null;
  if (placement === "top") return list.length ? <TopBar banners={list} /> : null;
  const shown = list;
  if (!shown.length) return null;
  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {shown.map((b) => <TrackedBanner key={b.id} banner={b} />)}
    </div>
  );
}
