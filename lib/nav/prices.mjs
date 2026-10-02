import { createPublicClient, http, parseAbi } from "viem";
import { NavError } from "./errors.mjs";

/** Chainlink proxies on Robinhood Chain mainnet (4663), from the Chainlink reference data directory, 8 decimals. */
export const CHAINLINK_FEEDS = {
  NVDA: { proxy: "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15", equity: true },
  GOOGL: { proxy: "0xF6f373a037c30F0e5010d854385cA89185AE638b", equity: true },
  COIN: { proxy: "0xA3a468A452940B7D6b69991207B508c609a98Ef2", equity: true },
  CRCL: { proxy: "0x6652eDf64bA3731C4F2D3ce821A0Fb1f1f6b482a", equity: true },
  SPY: { proxy: "0x319724394D3A0e3669269846abE664Cd621f9f6A", equity: true },
  QQQ: { proxy: "0x80901d846d5D7B030F26B480776EE3b29374C2ae", equity: true },
  GLD: { proxy: "0x470A51258068043bd43dC0a56245625C9fE86eB0", equity: true },
  USO: { proxy: "0x75a9c76Ef439e2C7c2E5a34Ab105EcFe3766431c", equity: true },
  AMD: { proxy: "0x943A29E7ae51A4798823ca9eEd2ed533B2A22C72", equity: true },
  TSLA: { proxy: "0x4A1166a659A55625345e9515b32adECea5547C38", equity: true },
  ETH: { proxy: "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9", equity: false },
  BTC: { proxy: "0xa2c5184bF03d373Dc9dE4876eb4Bce595B460251", equity: false },
  LINK: { proxy: "0xe86e3422Aa9B5e8ee9f3E41a63975bC387A8bce9", equity: false },
};
export const USDG_USD_FEED = "0x61B7e5650328764B076A108EFF5fa7282a1B9aD2";

/** Assets without a Chainlink feed on Robinhood Chain, priced from CoinGecko's public API. */
export const COINGECKO_IDS = { SOL: "solana", TAO: "bittensor", NEAR: "near", RENDER: "render-token" };

const CHAINLINK_MAX_AGE = { crypto: 26 * 3600, equity: 80 * 3600 };
const COINGECKO_MAX_AGE = 900;
const USDG_BAND = [99_000_000n, 101_000_000n];
const abi = parseAbi(["function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)"]);

/**
 * Validates a Chainlink round: positive answer, complete round, and fresh within the heartbeat window
 * (26 h for crypto; 80 h for US equities, whose 24/5 feeds pause over weekends).
 */
export function chainlinkUsd(ticker, [roundId, answer, , updatedAt, answeredInRound], nowSeconds) {
  const feed = CHAINLINK_FEEDS[ticker];
  if (!feed || answer <= 0n || answeredInRound < roundId) return undefined;
  const maxAge = feed.equity ? CHAINLINK_MAX_AGE.equity : CHAINLINK_MAX_AGE.crypto;
  return nowSeconds - Number(updatedAt) <= maxAge ? answer : undefined;
}

/** Converts an 8-decimal USD price into 6-decimal USDG using the USDG/USD rate (also 8 decimals). */
export function usdToUsdg(usd8, usdgUsd8) {
  return usd8 * 1_000_000n / usdgUsd8;
}

/**
 * Server-side market prices for the publisher. Chainlink on Robinhood Chain mainnet is primary; CoinGecko
 * covers assets with no feed there. Returns only prices that pass every check; callers treat gaps as unavailable.
 */
export function createMarketPrices({
  mainnetRpc = process.env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
  readRound,
  fetchImpl = fetch,
  now = () => Math.floor(Date.now() / 1000),
} = {}) {
  const client = readRound ? null : createPublicClient({ transport: http(mainnetRpc, { retryCount: 1, timeout: 10_000 }) });
  const round = readRound ?? (address => client.readContract({ address, abi, functionName: "latestRoundData" }));
  return async tickers => {
    const [usdgRound] = await Promise.all([round(USDG_USD_FEED)]);
    const usdg = usdgRound[1];
    if (usdg < USDG_BAND[0] || usdg > USDG_BAND[1]) {
      throw new NavError("PRICE_UNAVAILABLE", "USDG is outside its peg band, so prices are paused.");
    }
    const out = new Map();
    const linked = tickers.filter(ticker => CHAINLINK_FEEDS[ticker]);
    await Promise.all(linked.map(async ticker => {
      const usd = chainlinkUsd(ticker, await round(CHAINLINK_FEEDS[ticker].proxy), now());
      if (usd) out.set(ticker, usdToUsdg(usd, usdg));
    }));
    const gecko = tickers.filter(ticker => COINGECKO_IDS[ticker]);
    if (gecko.length) {
      const ids = gecko.map(ticker => COINGECKO_IDS[ticker]).join(",");
      const response = await fetchImpl(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_last_updated_at=true`, { signal: AbortSignal.timeout(10_000) });
      if (response.ok) {
        const body = await response.json();
        for (const ticker of gecko) {
          const entry = body[COINGECKO_IDS[ticker]];
          if (!entry || !(entry.usd > 0) || now() - entry.last_updated_at > COINGECKO_MAX_AGE) continue;
          out.set(ticker, usdToUsdg(BigInt(Math.round(entry.usd * 1e8)), usdg));
        }
      }
    }
    return out;
  };
}
