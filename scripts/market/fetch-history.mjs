/**
 * Regenerates lib/data/market-history.json with real daily closes for every Basket asset and the S&P 500.
 *
 * Usage: node scripts/market/fetch-history.mjs [--end YYYY-MM-DD] [--months 6]
 *
 * Sources follow the onchain publisher (lib/nav/prices.mjs): assets with a Chainlink feed on Robinhood Chain
 * take their history from Yahoo Finance daily closes (the same underlying markets), and the four assets the
 * publisher prices from CoinGecko take their history from CoinGecko. After fetching, the latest close of every
 * Chainlink asset is compared with the live Chainlink answer and the deviation is recorded.
 * Set ROBINHOOD_MAINNET_RPC_IP to pin the RPC host to an IP when local DNS blocks it.
 */
import { writeFile } from "node:fs/promises";
import https from "node:https";
import { CHAINLINK_FEEDS, COINGECKO_IDS } from "../../lib/nav/prices.mjs";

const YAHOO_SYMBOLS = {
  NVDA: "NVDA",
  GOOGL: "GOOGL",
  COIN: "COIN",
  CRCL: "CRCL",
  SPY: "SPY",
  QQQ: "QQQ",
  GLD: "GLD",
  USO: "USO",
  AMD: "AMD",
  TSLA: "TSLA",
  ETH: "ETH-USD",
  BTC: "BTC-USD",
  LINK: "LINK-USD",
  benchmark: "^GSPC",
};
const RPC = process.env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const DAY = 86_400_000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((arg, i, all) => (arg.startsWith("--") ? [[arg.slice(2), all[i + 1]]] : [])),
);
const end = args.end ?? iso(Date.now() - DAY);
const startDate = new Date(`${end}T00:00:00Z`);
startDate.setUTCMonth(startDate.getUTCMonth() - Number(args.months ?? 6));
const start = iso(startDate.getTime());
const inWindow = (point) => point.date >= start && point.date <= end;

/** Fetches JSON with a browser user agent and a timeout; Yahoo rejects bare clients. */
async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (banda market-history)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** Daily closes from Yahoo's chart API, keyed by the exchange-session date (UTC date for crypto). */
async function yahoo(symbol) {
  const period1 = Date.parse(start) / 1000;
  const period2 = (Date.parse(end) + DAY) / 1000;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
  const data = (await getJson(url)).chart.result?.[0];
  if (!data?.timestamp?.length) throw new Error(`Missing history: ${symbol}`);
  const offset = data.meta.gmtoffset * 1000;
  const points = data.timestamp.flatMap((t, i) => {
    const close = data.indicators.quote[0].close[i];
    return close > 0 ? [{ date: iso(t * 1000 + offset), close }] : [];
  });
  return { source: { provider: "Yahoo Finance", symbol, url, name: data.meta.shortName ?? symbol }, points };
}

/**
 * Daily prices from CoinGecko. Its 00:00 UTC sample on day D is used as the close of day D-1,
 * matching Yahoo's UTC-day crypto closes. The trailing intraday sample is dropped.
 */
async function coingecko(id) {
  const days = Math.ceil((Date.now() - Date.parse(start)) / DAY) + 2;
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const { prices } = await getJson(url);
  const points = prices
    .filter(([t]) => t % DAY === 0)
    .map(([t, close]) => ({ date: iso(t - DAY), close }));
  return { source: { provider: "CoinGecko", symbol: id, url, name: id }, points };
}

/** One eth_call to the Robinhood Chain RPC, optionally pinning the host to ROBINHOOD_MAINNET_RPC_IP. */
function ethCall(to, data) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] });
  const pin = process.env.ROBINHOOD_MAINNET_RPC_IP;
  const lookup = pin ? (_host, options, cb) => (options.all ? cb(null, [{ address: pin, family: 4 }]) : cb(null, pin, 4)) : undefined;
  return new Promise((resolve, reject) => {
    const request = https.request(RPC, { method: "POST", headers: { "content-type": "application/json" }, lookup, timeout: 15_000 }, (res) => {
      let text = "";
      res.on("data", (chunk) => (text += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(text);
          json.result ? resolve(json.result) : reject(new Error(JSON.stringify(json.error)));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("timeout", () => request.destroy(new Error("RPC timeout")));
    request.on("error", reject);
    request.end(body);
  });
}

/** Reads latestRoundData from a Chainlink proxy and returns { price, updatedAt }. */
async function chainlinkLatest(proxy) {
  const hex = (await ethCall(proxy, "0xfeaf968c")).slice(2);
  const word = (i) => BigInt(`0x${hex.slice(i * 64, i * 64 + 64)}`);
  return { price: Number(word(1)) / 1e8, updatedAt: new Date(Number(word(3)) * 1000).toISOString() };
}

const sources = {};
const series = {};
for (const [ticker, symbol] of Object.entries(YAHOO_SYMBOLS)) {
  const { source, points } = await yahoo(symbol);
  sources[ticker] = { ...source, fetchedAt: new Date().toISOString() };
  series[ticker] = points.filter(inWindow);
}
for (const [ticker, id] of Object.entries(COINGECKO_IDS)) {
  const { source, points } = await coingecko(id);
  sources[ticker] = { ...source, fetchedAt: new Date().toISOString() };
  series[ticker] = points.filter(inWindow);
}
for (const [ticker, points] of Object.entries(series)) {
  if (points.length < 20) throw new Error(`${ticker}: only ${points.length} closes in ${start}..${end}`);
}

const crossCheck = {};
for (const [ticker, { proxy }] of Object.entries(CHAINLINK_FEEDS)) {
  try {
    const live = await chainlinkLatest(proxy);
    const last = series[ticker].at(-1);
    crossCheck[ticker] = { ...live, historyClose: last.close, historyDate: last.date, deviationPct: Number(((live.price / last.close - 1) * 100).toFixed(2)) };
  } catch (error) {
    crossCheck[ticker] = { error: error.message };
  }
}

await writeFile(
  new URL("../../lib/data/market-history.json", import.meta.url),
  JSON.stringify(
    {
      fetchedAt: new Date().toISOString(),
      start,
      end: series.benchmark.at(-1).date,
      methodology:
        "Daily closes. Equities, ETFs and ETH/BTC/LINK from Yahoo Finance (the markets the Robinhood Chain Chainlink feeds track); SOL, TAO, NEAR and RENDER from CoinGecko, the publisher's source for them. Benchmark is the S&P 500 price index (^GSPC), excluding dividends. Backtests use the Basket's current weights, buy at the first close of the window and hold fixed quantities with no rebalancing, fees, slippage or yield. USDG is held at $1. Dates follow S&P 500 trading days; a missing close carries the last available close forward.",
      sources,
      crossCheck,
      series,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Saved ${Object.keys(series).length} series, ${start}..${series.benchmark.at(-1).date}`);
console.table(crossCheck);
