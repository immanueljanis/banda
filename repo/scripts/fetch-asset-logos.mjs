import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("public/assets/tickers");

const sources = {
  AMD: "https://cdn.simpleicons.org/amd",
  BTC: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  COIN: "https://cdn.simpleicons.org/coinbase",
  CRCL: "https://cdn.simpleicons.org/circle",
  ETH: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  GLD: "https://xstocks-metadata.backed.fi/logos/tokens/GLDx.png",
  GOOGL: "https://cdn.simpleicons.org/google",
  LINK: "https://coin-images.coingecko.com/coins/images/877/large/Chainlink_Logo_500.png",
  NEAR: "https://coin-images.coingecko.com/coins/images/10365/large/near.jpg",
  NVDA: "https://cdn.simpleicons.org/nvidia",
  QQQ: "https://xstocks-metadata.backed.fi/logos/tokens/QQQx.png",
  RENDER: "https://coin-images.coingecko.com/coins/images/11636/large/rndr.png",
  SOL: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
  SPY: "https://xstocks-metadata.backed.fi/logos/tokens/SPYx.png",
  TAO: "https://coin-images.coingecko.com/coins/images/28452/large/ARUsPeNQ_400x400.jpeg",
  TSLA: "https://cdn.simpleicons.org/tesla",
  USDG: "https://coin-images.coingecko.com/coins/images/51281/large/GDN_USDG_Token_200x200.png",
  USO: "https://www.marketbeat.com/logos/united-states-oil-fund-lp-logo.jpg",
};

await mkdir(outputDirectory, { recursive: true });

async function downloadPng(url) {
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=png&w=256&h=256&fit=contain`;
  const candidates = url.includes("cdn.robinhood.com")
    ? [proxyUrl, url]
    : [url, proxyUrl];

  for (const candidate of candidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(candidate, {
          headers: { "User-Agent": "Banda asset sync/1.0" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) continue;

        const contentType = response.headers.get("content-type") ?? "";
        if (contentType !== "image/png") continue;

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length >= 100) return bytes;
      } catch {
        // Retry once, then try the image proxy or original source.
      }
    }
  }

  throw new Error(`Could not download a valid image from ${url}`);
}

for (const [ticker, url] of Object.entries(sources)) {
  const bytes = await downloadPng(url);

  await writeFile(
    path.join(outputDirectory, `${ticker.toLowerCase()}.png`),
    bytes,
  );
  console.log(`${ticker}: ${bytes.length} bytes`);
}
