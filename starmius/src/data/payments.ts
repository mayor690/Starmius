export type ChainFamily = "evm" | "solana";

export interface UsdcChain {
  id: string;
  name: string;
  family: ChainFamily;
  /** Official USDC token contract or mint on that chain. Double check before going live. */
  contract: string;
  decimals: number;
  enabled: boolean;
}

export interface PaymentMethod {
  id: "naira" | "usdc";
  label: string;
  description: string;
  enabled: boolean;
}

export const payments = {
  methods: [
    { id: "naira", label: "Pay in Naira", description: "Card, bank transfer or USSD", enabled: true },
    { id: "usdc", label: "Pay with USDC", description: "Send USDC on your preferred chain", enabled: true },
  ] satisfies PaymentMethod[],

  usdc: {
    /** Your receiving wallets. One EVM address works on every EVM chain below. */
    receivingAddresses: {
      evm: "REPLACE_WITH_YOUR_EVM_ADDRESS",
      solana: "REPLACE_WITH_YOUR_SOLANA_ADDRESS",
    } satisfies Record<ChainFamily, string>,

    chains: [
      { id: "base", name: "Base", family: "evm", contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, enabled: true },
      // Arc mainnet (chain ID 5042). USDC is also Arc's gas token; this is the 6-decimal ERC-20 interface.
      { id: "arc", name: "Arc", family: "evm", contract: "0x3600000000000000000000000000000000000000", decimals: 6, enabled: true },
      { id: "ethereum", name: "Ethereum", family: "evm", contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, enabled: true },
      { id: "polygon", name: "Polygon", family: "evm", contract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6, enabled: true },
      { id: "arbitrum", name: "Arbitrum", family: "evm", contract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, enabled: true },
      { id: "optimism", name: "Optimism", family: "evm", contract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6, enabled: true },
      { id: "bnb", name: "BNB Chain", family: "evm", contract: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, enabled: true },
      { id: "solana", name: "Solana", family: "solana", contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, enabled: true },
    ] satisfies UsdcChain[],
  },
};
