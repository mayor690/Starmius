/** Turns a phone number as typed (e.g. 0803 123 4567) into the international digits WhatsApp links need. */
export function whatsappNumber(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("234")) return d;
  if (d.length === 11 && d.startsWith("0")) return `234${d.slice(1)}`;
  if (d.length === 10) return `234${d}`;
  return d;
}
