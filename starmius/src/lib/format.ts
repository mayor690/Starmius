const ngn = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const usdc = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatNGN = (n: number) => `₦${ngn.format(n)}`;
export const formatUSDC = (n: number) => `${usdc.format(n)} USDC`;
export const round2 = (n: number) => Math.round(n * 100) / 100;
