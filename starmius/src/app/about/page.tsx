import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/data/site";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = { title: site.about.title, description: site.about.intro };

export default function AboutPage() {
  const a = site.about;
  return (
    <>
      <section className="grid md:grid-cols-2">
        <div className="relative aspect-[2/3] max-h-[52rem] bg-charcoal-950 md:aspect-auto md:min-h-[44rem] md:max-h-none">
          <Image src={a.image} alt={a.imageAlt} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-left" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-r from-transparent to-ivory-100 max-md:hidden" />
        </div>
        <div className="flex items-center bg-ivory-100 px-6 py-24 md:px-16 lg:px-24">
          <div className="flex max-w-lg flex-col items-start gap-6">
            <p className="eyebrow">{a.eyebrow}</p>
            <h1 className="font-display text-5xl font-medium leading-tight">{a.title}</h1>
            <span className="h-px w-12 bg-champagne-500" aria-hidden="true" />
            <p className="leading-relaxed text-muted">{a.intro}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-28 lg:py-36">
        <div className="flex flex-col gap-20">
          {a.sections.map((s) => (
            <div key={s.title} className="flex flex-col items-center gap-5 text-center">
              <h2 className="font-display text-3xl font-medium md:text-4xl">{s.title}</h2>
              <p className="max-w-xl leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="grid gap-12 border-t border-champagne-300/50 pt-20 md:grid-cols-3">
          {a.values.map((v) => (
            <div key={v.title} className="flex flex-col items-center gap-3 text-center">
              <h3 className="eyebrow">{v.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
