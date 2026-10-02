import type { Address } from "viem";

const walletRpcUrl =
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ??
  "https://rpc.testnet.chain.robinhood.com/";

export const ROBINHOOD_TESTNET = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockTime: 250,
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address } },
  rpcUrls: { default: { http: [walletRpcUrl] }, public: { http: [walletRpcUrl] } },
  diamond: "0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7" as Address,
  settlementAsset: "0x7E955252E15c84f5768B83c41a71F9eba181802F" as Address,
  usdgFaucet: "https://faucet.paxos.com/?network=robinhood",
  explorer: "https://explorer.testnet.chain.robinhood.com",
} as const;

/** Contract strategy ids for BASKETS, in the same order: market-priced Baskets settled in Paxos USDG. Ids 1-20 are closed. */
export const STRATEGY_IDS = [21, 22, 23, 24, 25] as const;

/** Every live Basket leg is a pool-minted testnet mock priced at live market prices; none is a canonical token. */
export const CANONICAL_TESTNET_TICKERS = [] as const;
