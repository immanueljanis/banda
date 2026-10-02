import { NextResponse } from "next/server";
import { YIELD_SNAPSHOTS } from "@/constants/baskets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STEAKHOUSE_USDG = "0xBeEff033F34C046626B8D0A041844C5d1A5409dd";
const SOURCE = YIELD_SNAPSHOTS.USDG.source;

/**
 * Live net APY of the Steakhouse USDG vault on Morpho (Robinhood Chain mainnet), the rate Banda's income
 * portion is simulated at. Falls back to the last recorded snapshot when Morpho's API is unavailable.
 */
export async function GET() {
  let body = { apy: YIELD_SNAPSHOTS.USDG.apy, asOf: YIELD_SNAPSHOTS.USDG.asOf, live: false, source: SOURCE };
  try {
    const response = await fetch("https://api.morpho.org/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: `{vaultV2ByAddress(address:"${STEAKHOUSE_USDG}",chainId:4663){netApy}}` }),
      signal: AbortSignal.timeout(5_000),
    });
    const apy = (await response.json())?.data?.vaultV2ByAddress?.netApy;
    if (response.ok && Number.isFinite(apy) && apy > 0 && apy < 1) {
      body = { apy: Math.round(apy * 10_000) / 100, asOf: new Date().toISOString(), live: true, source: SOURCE };
    }
  } catch {}
  return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" } });
}
