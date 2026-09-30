import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import {
  CHAINLINK_FEEDS,
  COINGECKO_IDS,
  chainlinkUsd,
} from "@/lib/nav/prices.mjs";

export const runtime = "nodejs";
export const revalidate = 60;

type LivePrice = { price: number; updatedAt: string; source: string };
const abi = parseAbi([
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
]);

/**
 * Latest USD prices from the same sources the onchain publisher uses: Chainlink on Robinhood Chain
 * mainnet, CoinGecko for assets without a feed. Stale or failed prices are omitted, never guessed.
 */
export async function GET() {
  const client = createPublicClient({
    transport: http(
      process.env.ROBINHOOD_MAINNET_RPC_URL ||
        "https://rpc.mainnet.chain.robinhood.com",
      { retryCount: 0, timeout: 5_000 },
    ),
  });
  const now = Math.floor(Date.now() / 1000);
  const prices: Record<string, LivePrice> = {};
  await Promise.allSettled(
    Object.entries(CHAINLINK_FEEDS).map(async ([ticker, { proxy }]) => {
      const round = await client.readContract({
        address: proxy as `0x${string}`,
        abi,
        functionName: "latestRoundData",
      });
      const usd = chainlinkUsd(ticker, [...round], now);
      if (usd)
        prices[ticker] = {
          price: Number(usd) / 1e8,
          updatedAt: new Date(Number(round[3]) * 1000).toISOString(),
          source: "Chainlink",
        };
    }),
  );
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(COINGECKO_IDS).join(",")}&vs_currencies=usd&include_last_updated_at=true`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 60 } },
    );
    if (response.ok) {
      const body = await response.json();
      for (const [ticker, id] of Object.entries(COINGECKO_IDS)) {
        const entry = body[id];
        if (entry?.usd > 0 && now - entry.last_updated_at <= 900)
          prices[ticker] = {
            price: entry.usd,
            updatedAt: new Date(entry.last_updated_at * 1000).toISOString(),
            source: "CoinGecko",
          };
      }
    }
  } catch {}
  return NextResponse.json(
    { asOf: new Date().toISOString(), prices },
    {
      status: Object.keys(prices).length ? 200 : 503,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
