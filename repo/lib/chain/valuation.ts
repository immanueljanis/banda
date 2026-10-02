import { createPublicClient, http, parseAbi, type Address } from "viem";
import { ROBINHOOD_TESTNET } from "./config";

export type HoldingValue = {
  token: Address;
  ticker: string;
  amount: bigint;
  decimals: number;
  value?: bigint;
  pricedAt?: number;
};

export type BasketValuation = {
  holdings: HoldingValue[];
  value: bigint;
  costBasis: bigint;
  pricedAt?: number;
  complete: boolean;
};

const client = createPublicClient({ chain: ROBINHOOD_TESTNET, transport: http(), batch: { multicall: true } });
const abi = parseAbi([
  "function strategy(uint32) view returns (address,uint96,uint16,address,bool)",
  "function settlementAsset() view returns (address)",
  "function legs() view returns (address[],uint16[])",
  "function pool() view returns (address)",
  "function listings(address) view returns (uint128,uint64,uint64,bool,bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);
const tickerOf = (symbol: string) => (symbol === "WETH" ? "ETH" : symbol === "tUSDG" ? "USDG" : symbol);

/**
 * Values a Basket from what its ERC-6551 account actually holds, at the prices the pool last published.
 * Needs no fresh quote, so it is always available; the redeem quote may differ slightly once prices refresh.
 * Cost basis is exact: one share is one deposited USDG base unit and partial redemptions burn shares pro rata.
 */
export async function valueBasket(strategyId: number, account: Address, shares: bigint): Promise<BasketValuation> {
  const [[strategy], settlement] = await Promise.all([
    client.readContract({ address: ROBINHOOD_TESTNET.diamond, abi, functionName: "strategy", args: [strategyId] }),
    client.readContract({ address: ROBINHOOD_TESTNET.diamond, abi, functionName: "settlementAsset" }),
  ]);
  const [[tokens], pool] = await Promise.all([
    client.readContract({ address: strategy, abi, functionName: "legs" }),
    client.readContract({ address: strategy, abi, functionName: "pool" }),
  ]);
  const holdings = await Promise.all(tokens.map(async (token): Promise<HoldingValue> => {
    const [symbol, decimals, amount] = await Promise.all([
      client.readContract({ address: token, abi, functionName: "symbol" }),
      client.readContract({ address: token, abi, functionName: "decimals" }),
      client.readContract({ address: token, abi, functionName: "balanceOf", args: [account] }),
    ]);
    if (token.toLowerCase() === settlement.toLowerCase()) return { token, ticker: tickerOf(symbol), amount, decimals, value: amount };
    const listing = await client.readContract({ address: pool, abi, functionName: "listings", args: [token] }).catch(() => undefined);
    return listing
      ? { token, ticker: tickerOf(symbol), amount, decimals, value: amount * listing[0] / BigInt(listing[2]), pricedAt: Number(listing[1]) }
      : { token, ticker: tickerOf(symbol), amount, decimals };
  }));
  const priced = holdings.filter((holding) => holding.pricedAt !== undefined).map((holding) => holding.pricedAt as number);
  return {
    holdings,
    value: holdings.reduce((sum, holding) => sum + (holding.value ?? BigInt(0)), BigInt(0)),
    costBasis: shares,
    pricedAt: priced.length ? Math.min(...priced) : undefined,
    complete: holdings.every((holding) => holding.value !== undefined),
  };
}
