import type { Address } from "viem";

const walletRpcUrl =
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ??
  "https://rpc.testnet.chain.robinhood.com/";

export const ROBINHOOD_TESTNET = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockTime: 250,
  rpcUrls: { default: { http: [walletRpcUrl] }, public: { http: [walletRpcUrl] } },
  diamond: "0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7" as Address,
  settlementAsset: "0xB42Df4e64356cAFbAEB63f572Ec95CC3BAE75dba" as Address,
  explorer: "https://explorer.testnet.chain.robinhood.com",
} as const;

/** Contract strategy ids for BASKETS, in the same order: market-priced, test-USDG Baskets. Ids 1-15 are closed. */
export const STRATEGY_IDS = [16, 17, 18, 19, 20] as const;

/** Every live Basket leg is a pool-minted testnet mock priced at live market prices; none is a canonical token. */
export const CANONICAL_TESTNET_TICKERS = [] as const;
