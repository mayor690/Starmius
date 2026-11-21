import Link from "next/link";
import { site } from "@/data/site";
import { Logo } from "./logo";
import { HeaderActions } from "./header-actions";
import { MobileMenu } from "./mobile-menu";

export function Header() {
  return (
    <header className="header-dark sticky top-0 z-40 border-b border-champagne-500/30 bg-charcoal-950/95 backdrop-blur-md">
      <div className="relative mx-auto flex h-20 max-w-7xl items-center px-6 lg:px-10">
        <div className="flex flex-1 items-center">
          <nav className="hidden items-center gap-10 md:flex" aria-label="Primary">
            {site.nav.map((i) => (
              <Link key={i.href} href={i.href} className="nav-link">{i.label}</Link>
            ))}
          </nav>
          <MobileMenu items={site.nav} />
        </div>
        <Logo tone="light" />
        <div className="flex flex-1 justify-end"><HeaderActions /></div>
      </div>
    </header>
  );
}
