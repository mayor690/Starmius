import { payments, TOKENS } from "@/data/payments";
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
  // The most common mistake: pasting a token contract instead of your own wallet.
  for (const c of payments.crypto.chains) {
    for (const t of TOKENS) {
      if (c.tokens[t]?.contract.toLowerCase() === value.toLowerCase()) return `That is the ${t} token contract on ${c.name}, not a wallet. Use your own wallet address.`;
    }
  }
  return "";
}

/** The seed from data/payments.ts, ignoring its REPLACE_ placeholders. */
export const seedUsdc = (): UsdcSettings => {
  const a = payments.crypto.receivingAddresses;
  return {
    evmAddress: a.evm.startsWith("REPLACE") ? "" : a.evm,
    solanaAddress: a.solana.startsWith("REPLACE") ? "" : a.solana,
    disabledChains: payments.crypto.chains.filter((c) => !c.enabled).map((c) => c.id),
    disabledTokens: [],
  };
};
