const ngn = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const usdc = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatNGN = (n: number) => `₦${ngn.format(n)}`;
/** Item prices are dollars. USDC and USDT are both worth one dollar, so customers pay the same amount in either. */
export const formatUSD = (n: number) => `$${usdc.format(n)}`;
/** An amount to send in a specific token, e.g. "12.00 USDT". */
export const formatToken = (n: number, token: string) => `${usdc.format(n)} ${token}`;
export const round2 = (n: number) => Math.round(n * 100) / 100;
