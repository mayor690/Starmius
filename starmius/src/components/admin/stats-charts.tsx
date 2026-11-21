"use client";

import { formatNGN } from "@/lib/format";

export const n0 = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));
export const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.01 ? 2 : 1)}%`;

export function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-champagne-300/60 bg-ivory-50 p-5">
      <p className="field-label">{label}</p>
      <p className="mt-2 font-display text-3xl font-medium tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Panel({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="border border-champagne-300/60 bg-ivory-50 p-6">
      <h3 className="font-display text-2xl font-medium">{title}</h3>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Daily bars. Pure divs, so no chart library is needed. */
export function Bars({ data, money = false }: { data: { label: string; value: number }[]; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const first = data[0]?.label.slice(5);
  const last = data[data.length - 1]?.label.slice(5);
  return (
    <div>
      <div className="flex h-36 items-end gap-px" role="img" aria-label="Daily chart">
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 items-end">
            <div className="w-full bg-champagne-500/80 transition-colors group-hover:bg-champagne-700" style={{ height: `${Math.max(d.value ? 3 : 0, (d.value / max) * 100)}%` }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap bg-charcoal-950 px-2 py-1 text-[0.65rem] text-ivory-50 group-hover:block">
              {d.label.slice(5)}: {money ? formatNGN(d.value) : n0(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[0.65rem] tracking-wider text-muted"><span>{first}</span><span>{last}</span></div>
    </div>
  );
}

/** Ranked list with a proportional bar behind each row. */
export function Ranked({ rows, empty = "No data yet." }: { rows: { key: string; value: number; label?: string }[]; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.key} className="relative flex items-center justify-between gap-4 px-3 py-2 text-sm">
          <span className="absolute inset-y-0 left-0 bg-champagne-200/60" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden="true" />
          <span className="relative truncate">{r.key}</span>
          <span className="relative tabular-nums">{r.label ?? n0(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
