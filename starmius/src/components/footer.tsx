import Link from "next/link";
import { site } from "@/data/site";
import { getContact } from "@/lib/store";
import { Logo } from "./logo";
import { SocialLinks } from "./social-links";
import { Icon } from "./icons";

export async function Footer() {
  const contact = await getContact();
  return (
    <footer className="relative mt-32 overflow-hidden bg-gradient-to-b from-charcoal-800 to-charcoal-950 text-ivory-200">
      <div className="glow-rays glow-rays-dark" />
      <div className="stars stars-dark" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-14 md:grid-cols-3">
          <div className="flex flex-col items-start gap-5">
            <Logo tone="light" />
            <p className="text-sm tracking-[0.2em] text-champagne-300">{site.footer.blurb}</p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-4">
            {site.nav.map((i) => (
              <Link key={i.href} href={i.href} className="w-fit text-xs uppercase tracking-[0.3em] text-ivory-200 transition-colors hover:text-champagne-300">{i.label}</Link>
            ))}
          </nav>
          <div className="flex flex-col gap-4">
            {contact.channels.map((c) => (
              <a key={c.id} href={c.href} className="flex w-fit items-center gap-3 text-sm tracking-wider text-ivory-200 transition-colors hover:text-champagne-300">
                <Icon name={c.icon} className="size-4 text-champagne-400" />
                {c.value}
              </a>
            ))}
            <SocialLinks context="footer" className="mt-3" />
            <p className="text-xs tracking-[0.2em] text-champagne-400">{contact.brandHandle}</p>
          </div>
        </div>
        <div className="mt-16 border-t border-champagne-500/20 pt-8 text-xs tracking-wider text-ivory-300">
          {site.footer.legal.replace("{year}", String(new Date().getFullYear()))}
        </div>
      </div>
    </footer>
  );
}
