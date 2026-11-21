import { payments } from "@/data/payments";
import type { UsdcSettings } from "./types";

export const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
export const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const ZERO = /^0x0{40}$/;

/** Returns an error message, or "" when the address is fine (or empty). */
export function addressProblem(kind: "evm" | "solana", value: string): string {
  if (!value) return "";
  if (kind === "evm") {
    if (!EVM_ADDRESS.test(value)) return "An EVM address starts with 0x and has 42 characters in total.";
    if (ZERO.test(value)) return "That is the empty (zero) address. Funds sent there are lost.";
  } else if (!SOLANA_ADDRESS.test(value)) {
    return "A Solana address is 32 to 44 letters and numbers.";
  }
  // The most common mistake: pasting the USDC token contract instead of your own wallet.
  const token = payments.usdc.chains.find((c) => c.contract.toLowerCase() === value.toLowerCase());
  return token ? `That is the USDC token contract on ${token.name}, not a wallet. Use your own wallet address.` : "";
}

/** The seed from data/payments.ts, ignoring its REPLACE_ placeholders. */
export const seedUsdc = (): UsdcSettings => {
  const a = payments.usdc.receivingAddresses;
  return {
    evmAddress: a.evm.startsWith("REPLACE") ? "" : a.evm,
    solanaAddress: a.solana.startsWith("REPLACE") ? "" : a.solana,
    disabledChains: payments.usdc.chains.filter((c) => !c.enabled).map((c) => c.id),
  };
};
