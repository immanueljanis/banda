import { writeFile } from "node:fs/promises";
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};
const [lido, pools] = await Promise.all([
  get("https://eth-api.lido.fi/v1/protocol/steth/apr/last"),
  get("https://yields.llama.fi/pools"),
]);
const pool = pools.data.find(
  (p) =>
    p.pool === "d9fa8e14-0447-4207-9ae8-7810199dfa1f" &&
    p.chain === "Arbitrum" &&
    p.project === "aave-v3" &&
    p.underlyingTokens?.[0]?.toLowerCase() ===
      "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
);
if (
  !pool ||
  !Number.isFinite(pool.apyBase) ||
  !Number.isFinite(lido.data?.apr) ||
  !Number.isFinite(lido.data?.timeUnix)
)
  throw new Error("Missing or invalid yield data");
const fetchedAt = new Date().toISOString();
const data = {
  fetchedAt,
  assets: {
    aUSDC: {
      apy: pool.apyBase,
      asOf: fetchedAt,
      source: "https://defillama.com/yields/pool/" + pool.pool,
      provider: "Aave V3 · Arbitrum native USDC",
      method:
        "Base supply APY reported by DefiLlama. Incentive rewards excluded. Fetch time shown; the upstream observation can be earlier.",
    },
    wstETH: {
      apy: ((1 + lido.data.apr / 100 / 365) ** 365 - 1) * 100,
      asOf: new Date(lido.data.timeUnix * 1000).toISOString(),
      source: "https://eth-api.lido.fi/v1/protocol/steth/apr/last",
      provider: "Lido · Ethereum staking",
      method: `Estimated APY from Lido APR of ${lido.data.apr}%, assuming daily compounding at an unchanged rate. Rewards accrue through the stETH exchange rate.`,
    },
  },
};
await writeFile(
  new URL("../lib/data/yield-snapshot.json", import.meta.url),
  JSON.stringify(data, null, 2) + "\n",
);
console.log(JSON.stringify(data));
