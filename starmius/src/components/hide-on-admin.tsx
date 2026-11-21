"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The storefront header and footer never render inside the owner area. */
export function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}
