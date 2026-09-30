import type { Address } from "viem";

const walletRpcUrl =
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ??
  "https://rpc.testnet.chain.robinhood.com/";

export const ROBINHOOD_TESTNET = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [walletRpcUrl] }, public: { http: [walletRpcUrl] } },
  diamond: "0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7" as Address,
  settlementAsset: "0x7E955252E15c84f5768B83c41a71F9eba181802F" as Address,
  usdgFaucet: "https://faucet.paxos.com/?network=robinhood",
  explorer: "https://explorer.testnet.chain.robinhood.com",
} as const;

/** Contract strategy ids for BASKETS, in the same order. Legacy ids 1-5 are closed to deposits. */
export const STRATEGY_IDS = [6, 7, 8, 9, 10] as const;

/** Tokens issued natively on Robinhood Chain testnet; every other Basket holding is a testnet mock. */
export const CANONICAL_TESTNET_TICKERS = ["AMD", "TSLA", "ETH", "USDG"] as const;
