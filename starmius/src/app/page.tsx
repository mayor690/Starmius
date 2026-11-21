import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";
import { getFeaturedProducts } from "@/lib/products";
import { ProductGrid } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { BannerSlot } from "@/components/banner-slot";
import { Sparkle } from "@/components/sparkle";

export default async function HomePage() {
  const featured = await getFeaturedProducts();
  return (
    <>
      <section className="relative flex min-h-[calc(100svh-5rem)] items-center justify-center overflow-hidden bg-gradient-to-b from-ivory-100 via-ivory-50 to-ivory-50">
        <div className="glow-rays" />
        <div className="stars" />
        <Sparkle className="left-[14%] top-[16%] size-6" />
        <Sparkle className="left-[30%] top-[52%] size-3" />
        <Sparkle className="right-[18%] top-[22%] size-4" />
        <div className="relative flex flex-col items-center px-6 py-24 text-center">
          <h1 className="gold-text font-display text-[clamp(3.25rem,12vw,9rem)] font-medium leading-none tracking-[0.06em]">{site.name.toUpperCase()}</h1>
          <div className="mt-6 flex w-full max-w-xl items-center gap-5" aria-hidden="true">
            <span className="h-px flex-1 bg-champagne-500/70" />
            <span className="text-sm tracking-[0.7em] text-champagne-700">{site.descriptor.toUpperCase()}</span>
            <span className="h-px flex-1 bg-champagne-500/70" />
          </div>
          <span className="my-8 h-px w-16 bg-champagne-500/70" aria-hidden="true" />
          <p className="text-sm tracking-[0.25em] text-champagne-700 md:text-base">{site.tagline}</p>
          <div className="mt-14 flex flex-wrap justify-center gap-4">
            <Link href={site.hero.primaryCta.href} className="btn btn-primary">{site.hero.primaryCta.label}</Link>
            <Link href={site.hero.secondaryCta.href} className="btn btn-outline">{site.hero.secondaryCta.label}</Link>
          </div>
        </div>
      </section>

      <BannerSlot placement="home" className="mx-auto mt-16 max-w-7xl px-6 lg:px-10" />

      <section className="mx-auto max-w-7xl px-6 py-28 lg:px-10 lg:py-40">
        <SectionHeading eyebrow={site.featured.eyebrow} title={site.featured.title} intro={site.featured.intro} />
        <div className="mt-20"><ProductGrid products={featured} empty={site.shop.empty} /></div>
        <div className="mt-20 text-center"><Link href={site.featured.cta.href} className="btn btn-outline">{site.featured.cta.label}</Link></div>
      </section>

      <section className="grid items-stretch md:grid-cols-2">
        <div className="relative aspect-[2/3] max-h-[52rem] w-full bg-charcoal-950 md:aspect-auto md:min-h-[40rem] md:max-h-none">
          <Image src={site.story.image} alt={site.story.imageAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-left" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-r from-transparent to-ivory-100 max-md:hidden" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-ivory-100 md:hidden" />
        </div>
        <div className="flex items-center bg-ivory-100 px-6 py-24 md:px-16 lg:px-24">
          <div className="flex max-w-lg flex-col items-start gap-6">
            <p className="eyebrow">{site.story.eyebrow}</p>
            <h2 className="font-display text-4xl font-medium leading-tight md:text-5xl">{site.story.title}</h2>
            <span className="h-px w-12 bg-champagne-500" aria-hidden="true" />
            {site.story.body.map((p) => <p key={p} className="leading-relaxed text-muted">{p}</p>)}
            <Link href={site.story.cta.href} className="btn btn-outline mt-4">{site.story.cta.label}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
