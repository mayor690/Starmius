export type ChainFamily = "evm" | "solana";
export type Token = "USDC" | "USDT";
export const TOKENS: Token[] = ["USDC", "USDT"];

export interface TokenInfo {
  /** Official token contract (EVM) or mint (Solana) on that chain. Double check before going live. */
  contract: string;
  decimals: number;
}

export interface CryptoChain {
  id: string;
  name: string;
  family: ChainFamily;
  /** Tokens accepted on this chain. A chain without a token simply does not offer it. */
  tokens: Partial<Record<Token, TokenInfo>>;
  enabled: boolean;
}

export interface PaymentMethod {
  id: "naira" | "bank" | "usdc" | "usdt";
  label: string;
  description: string;
  enabled: boolean;
}

export const payments = {
  methods: [
    { id: "naira", label: "Pay in Naira", description: "Card or USSD, confirmed instantly", enabled: true },
    { id: "bank", label: "Bank transfer", description: "Transfer from any bank app, then confirm on WhatsApp", enabled: true },
    { id: "usdc", label: "Pay with USDC", description: "Send USDC on your preferred chain", enabled: true },
    { id: "usdt", label: "Pay with USDT", description: "Send USDT on your preferred chain", enabled: true },
  ] satisfies PaymentMethod[],

  crypto: {
    /** Fallback wallets. The owner sets the real ones in the admin dashboard. One EVM address works on every EVM chain. */
    receivingAddresses: {
      evm: "REPLACE_WITH_YOUR_EVM_ADDRESS",
      solana: "REPLACE_WITH_YOUR_SOLANA_ADDRESS",
    } satisfies Record<ChainFamily, string>,

    chains: [
      { id: "base", name: "Base", family: "evm", enabled: true, tokens: {
        USDC: { contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
        USDT: { contract: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6 },
      } },
      // Arc mainnet (chain ID 5042). USDC is also Arc's gas token; this is the 6-decimal ERC-20 interface. No USDT on Arc.
      { id: "arc", name: "Arc", family: "evm", enabled: true, tokens: {
        USDC: { contract: "0x3600000000000000000000000000000000000000", decimals: 6 },
      } },
      { id: "ethereum", name: "Ethereum", family: "evm", enabled: true, tokens: {
        USDC: { contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
        USDT: { contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
      } },
      { id: "polygon", name: "Polygon", family: "evm", enabled: true, tokens: {
        USDC: { contract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
        USDT: { contract: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
      } },
      { id: "arbitrum", name: "Arbitrum", family: "evm", enabled: true, tokens: {
        USDC: { contract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
        USDT: { contract: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
      } },
      { id: "optimism", name: "Optimism", family: "evm", enabled: true, tokens: {
        USDC: { contract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
        USDT: { contract: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
      } },
      { id: "bnb", name: "BNB Chain", family: "evm", enabled: true, tokens: {
        USDC: { contract: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
        USDT: { contract: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
      } },
      { id: "solana", name: "Solana", family: "solana", enabled: true, tokens: {
        USDC: { contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
        USDT: { contract: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
      } },
    ] satisfies CryptoChain[],
  },
};
