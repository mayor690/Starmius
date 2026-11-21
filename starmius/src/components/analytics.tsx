"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageView } from "@/lib/track";

/** Counts a page view whenever the visitor opens a page. Renders nothing. */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => { trackPageView(pathname); }, [pathname]);
  return null;
}
