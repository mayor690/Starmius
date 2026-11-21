export function SectionHeading({ eyebrow, title, intro, align = "center" }: { eyebrow?: string; title: string; intro?: string; align?: "center" | "left" }) {
  const a = align === "center" ? "text-center mx-auto items-center" : "items-start";
  return (
    <div className={`flex max-w-2xl flex-col gap-5 ${a}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="font-display text-4xl font-medium leading-tight md:text-5xl">{title}</h2>
      <span className="h-px w-12 bg-champagne-500" aria-hidden="true" />
      {intro && <p className="leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}
