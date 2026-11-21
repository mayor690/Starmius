import type { Metadata } from "next";
import { site } from "@/data/site";
import { AuthPanel } from "@/components/auth-panel";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = { title: "Account" };

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-6 py-24 lg:py-32">
      <SectionHeading title={site.auth.title} intro={site.auth.intro} />
      <div className="mt-16"><AuthPanel next={safeNext(next)} /></div>
    </div>
  );
}
