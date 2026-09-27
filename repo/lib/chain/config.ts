import type { Address } from "viem";

export const ROBINHOOD_TESTNET = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] }, public: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  diamond: "0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7" as Address,
  settlementAsset: "0xB42Df4e64356cAFbAEB63f572Ec95CC3BAE75dba" as Address,
  explorer: "https://explorer.testnet.chain.robinhood.com",
} as const;

export const STRATEGY_IDS = [1, 2, 3, 4, 5] as const;
