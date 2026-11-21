import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 px-6 py-40 text-center">
      <h1 className="gold-text font-display text-6xl font-medium">404</h1>
      <p className="text-muted">We could not find that page.</p>
      <Link href="/shop" className="btn btn-outline">Back to shop</Link>
    </div>
  );
}
