"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/types";
import { Icon } from "./icons";

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} className="p-2 text-ivory-100">
        <Icon name={open ? "close" : "menu"} className="size-6" />
      </button>
      {open && (
        <nav className="absolute left-0 right-0 top-full border-b border-champagne-500/30 bg-charcoal-950 px-6 py-8" aria-label="Mobile">
          <ul className="flex flex-col gap-6">
            {items.map((i) => (
              <li key={i.href}><Link href={i.href} className="nav-link">{i.label}</Link></li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
