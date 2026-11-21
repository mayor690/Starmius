import type { Metadata } from "next";
import { site } from "@/data/site";
import { getContact, getSocials } from "@/lib/store";
import { Icon } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = { title: site.contactPage.title, description: site.contactPage.intro };

export default async function ContactPage() {
  const [contact, socials] = await Promise.all([getContact(), getSocials()]);
  const c = site.contactPage;
  const whatsapp = socials.find((s) => s.id === "whatsapp");
  const blocks = [contact.address, contact.hours].filter((b): b is { label: string; lines: string[] } => b !== null);
  const contactSocials = socials.filter((s) => s.showInContact !== false);

  return (
    <div className="mx-auto max-w-4xl px-6 py-24 lg:py-32">
      <SectionHeading eyebrow={c.eyebrow} title={c.title} intro={c.intro} />

      <div className="mt-20 grid gap-12 sm:grid-cols-2">
        {contact.channels.map((ch) => (
          <div key={ch.id} className="flex flex-col items-center gap-3 text-center">
            <Icon name={ch.icon} className="size-6 text-champagne-600" />
            <p className="eyebrow !text-[0.62rem]">{ch.label}</p>
            {ch.href ? <a href={ch.href} className="font-display text-2xl transition-colors hover:text-champagne-700">{ch.value}</a> : <p className="font-display text-2xl">{ch.value}</p>}
          </div>
        ))}
        {blocks.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-3 text-center">
            <p className="eyebrow !text-[0.62rem]">{b.label}</p>
            {b.lines.map((l) => <p key={l} className="text-muted">{l}</p>)}
          </div>
        ))}
      </div>

      {whatsapp && (
        <div className="mt-16 text-center">
          <a href={whatsapp.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">{c.whatsappCta}</a>
        </div>
      )}

      <div className="mt-24 border-t border-champagne-300/50 pt-16 text-center">
        <p className="eyebrow mb-8">{c.socialsTitle}</p>
        <ul className="flex flex-wrap justify-center gap-x-10 gap-y-6">
          {contactSocials.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-champagne-700 transition-colors hover:text-ink">
                <Icon name={s.icon} className="size-6" />
                <span className="text-xs tracking-[0.2em]">{s.label}</span>
                {s.handle && <span className="text-xs text-muted">{s.handle}</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
