import { getSocials } from "@/lib/store";
import { Icon } from "./icons";

export async function SocialLinks({ context, className = "" }: { context: "footer" | "contact"; className?: string }) {
  const items = (await getSocials()).filter((s) => (context === "footer" ? s.showInFooter !== false : s.showInContact !== false));
  return (
    <ul className={`flex flex-wrap items-center gap-5 ${className}`}>
      {items.map((s) => (
        <li key={s.id}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className={`inline-flex ${context === "footer" ? "text-champagne-300 hover:text-champagne-200" : "text-champagne-700 hover:text-ink"} transition-colors`}>
            <Icon name={s.icon} className="size-6" />
          </a>
        </li>
      ))}
    </ul>
  );
}
