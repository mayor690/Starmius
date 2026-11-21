"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/lib/admin-api";

export function ImageUploader({ images, onChange, max = 8, label = "Images (first one is the main image)", hint = "Portrait photos (4:5) look best." }: { images: string[]; onChange: (next: string[]) => void; max?: number; label?: string; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const added: string[] = [];
    try {
      for (const f of Array.from(files)) added.push(await uploadImage(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
    if (added.length) onChange([...images, ...added].slice(0, max));
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const move = (i: number, dir: -1 | 1) => {
    const next = [...images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j] as string, next[i] as string];
    onChange(next);
  };

  return (
    <div>
      <p className="field-label">{label}</p>
      <ul className="mt-3 flex flex-wrap gap-4">
        {images.map((src, i) => (
          <li key={src} className="w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="aspect-[4/5] w-full border border-champagne-300/60 object-cover" />
            <div className="mt-2 flex justify-between text-xs">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-champagne-700 disabled:opacity-30" aria-label="Move earlier">&larr;</button>
              <button type="button" onClick={() => onChange(images.filter((x) => x !== src))} className="text-red-800">Remove</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="text-champagne-700 disabled:opacity-30" aria-label="Move later">&rarr;</button>
            </div>
          </li>
        ))}
        {images.length < max && (
          <li className="w-28">
            <button type="button" onClick={() => input.current?.click()} disabled={busy}
              className="grid aspect-[4/5] w-full place-items-center border border-dashed border-champagne-600 text-xs uppercase tracking-[0.2em] text-champagne-700 hover:bg-ivory-100 disabled:opacity-50">
              {busy ? "Uploading" : "+ Add"}
            </button>
          </li>
        )}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
      <p className="mt-3 text-xs text-muted">JPG, PNG or WebP, up to 5 MB each. {hint}</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
