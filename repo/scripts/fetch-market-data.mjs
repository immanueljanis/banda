import { mkdir, writeFile } from "node:fs/promises";
const start = "2025-06-12",
  end = "2025-09-12";
const symbols = {
  wBTC: "BTC-USD",
  WETH: "ETH-USD",
  PAXG: "PAXG-USD",
  wstETH: "WSTETH-USD",
  ARB: "ARB11841-USD",
  GMX: "GMX11857-USD",
  PENDLE: "PENDLE-USD",
  benchmark: "^GSPC",
};
const sources = {};
const series = {};
for (const [ticker, symbol] of Object.entries(symbols)) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Date.parse(start) / 1000}&period2=${Date.parse(end) / 1000}&interval=1d`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${symbol}: ${response.status}`);
  const data = (await response.json()).chart.result?.[0];
  if (!data?.timestamp?.length) throw new Error(`Missing history: ${symbol}`);
  sources[ticker] = { symbol, url, name: data.meta.shortName };
  series[ticker] = data.timestamp.flatMap((timestamp, i) => {
    const close = data.indicators.quote[0].close[i];
    return close > 0
      ? [{ date: new Date(timestamp * 1000).toISOString().slice(0, 10), close }]
      : [];
  });
}
await mkdir("lib/data", { recursive: true });
await writeFile(
  "lib/data/market-history.json",
  JSON.stringify(
    {
      fetchedAt: new Date().toISOString(),
      start,
      end: "2025-09-11",
      sources,
      series,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Saved verified daily closing prices:",
  Object.keys(series).join(", "),
);

const lists = await Promise.all(
  ["arbitrum-one", "ethereum"].map(async (chain) => {
    const response = await fetch(
      `https://tokens.coingecko.com/${chain}/all.json`,
    );
    if (!response.ok) throw new Error("Token list unavailable");
    return (await response.json()).tokens;
  }),
);
const addresses = {
  wBTC: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
  WETH: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  PAXG: "0x45804880de22913dafe09f4980848ece6ecbaf78",
  aUSDC: "0x724dc807b04555b71ed48a6896b6f41593b8c637",
  wstETH: "0x5979d7b546e38e414f7e9822514be443a4800529",
  ARB: "0x912ce59144191c1204e64559fe8253a0e49e6548",
  GMX: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
  PENDLE: "0x0c880f6761f1af8d9aa9c466984b80dab9a8c9e8",
};
await mkdir("public/assets", { recursive: true });
const logos = {};
for (const [ticker, address] of Object.entries(addresses)) {
  const token = lists.flat().find((t) => t.address.toLowerCase() === address);
  if (!token) throw new Error(`Missing logo ${ticker}`);
  const response = await fetch(token.logoURI);
  if (!response.ok) throw new Error(`Logo ${ticker}: ${response.status}`);
  const type = response.headers.get("content-type");
  const ext = type.includes("webp")
    ? "webp"
    : type.includes("jpeg")
      ? "jpg"
      : type.includes("svg")
        ? "svg"
        : "png";
  const path = `/assets/${ticker.toLowerCase()}.${ext}`;
  await writeFile(`public${path}`, Buffer.from(await response.arrayBuffer()));
  logos[ticker] = { path, source: token.logoURI };
}
await writeFile(
  "lib/data/asset-logos.json",
  JSON.stringify(logos, null, 2) + "\n",
);
console.log("Saved eight asset logos locally.");
