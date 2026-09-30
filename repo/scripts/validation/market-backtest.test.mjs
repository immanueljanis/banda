import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maxDrawdown, priceOn, quote, simulate, windowDates } from "../../lib/market/backtest.mjs";

const series = {
  benchmark: [
    { date: "2026-09-25", close: 100 },
    { date: "2026-09-28", close: 110 },
    { date: "2026-09-29", close: 99 },
  ],
  NVDA: [
    { date: "2026-09-25", close: 200 },
    { date: "2026-09-28", close: 300 },
    { date: "2026-09-29", close: 100 },
  ],
  BTC: [
    { date: "2026-09-25", close: 80 },
    { date: "2026-09-26", close: 90 },
    { date: "2026-09-29", close: 40 },
  ],
};
const dates = series.benchmark.map((p) => p.date);

test("both lines start at $10,000 and weights split the capital", () => {
  const points = simulate([{ ticker: "NVDA", weight: 50 }, { ticker: "USDG", weight: 50 }], series, dates);
  assert.deepEqual(points.map((p) => p.date), dates);
  assert.equal(points[0].basket, 10_000);
  assert.equal(points[0].benchmark, 10_000);
  assert.equal(points[1].basket, 5_000 * 1.5 + 5_000);
  assert.equal(points[1].benchmark, 11_000);
  assert.ok(Math.abs(points[2].basket - (2_500 + 5_000)) < 1e-9);
});

test("a missing close carries the previous close forward, never a later one", () => {
  assert.equal(priceOn(series, "BTC", "2026-09-28"), 90);
  assert.equal(priceOn(series, "BTC", "2026-09-24"), undefined);
  assert.equal(priceOn(series, "USDG", "2000-01-01"), 1);
  const points = simulate([{ ticker: "BTC", weight: 100 }], series, dates);
  assert.equal(points[1].basket, 10_000 * (90 / 80));
  assert.equal(points[2].basket, 5_000);
});

test("an asset with no price at the window start is an error, not a silent zero", () => {
  assert.throws(() => simulate([{ ticker: "TAO", weight: 100 }], series, dates), /Missing TAO/);
});

test("windows use benchmark trading dates ending on the last close", () => {
  assert.deepEqual(windowDates(series.benchmark, "2026-09-29", 1), ["2026-09-28", "2026-09-29"]);
  assert.deepEqual(windowDates(series.benchmark, "2026-09-28", 30), ["2026-09-25", "2026-09-28"]);
});

test("quotes report the latest close and daily change; USDG is flat", () => {
  const nvda = quote(series, "NVDA", dates);
  assert.equal(nvda.price, 100);
  assert.equal(nvda.date, "2026-09-29");
  assert.ok(Math.abs(nvda.change - (100 / 300 - 1) * 100) < 1e-9);
  assert.equal(quote(series, "USDG", dates).change, 0);
  assert.equal(maxDrawdown(simulate([{ ticker: "NVDA", weight: 100 }], series, dates)), (100 / 300 - 1) * 100);
});

test("committed market history covers every asset on every benchmark date", () => {
  const market = JSON.parse(readFileSync(new URL("../../lib/data/market-history.json", import.meta.url), "utf8"));
  const tickers = ["NVDA", "TAO", "GOOGL", "NEAR", "GLD", "COIN", "CRCL", "ETH", "SOL", "LINK", "BTC", "SPY", "QQQ", "AMD", "TSLA", "RENDER", "USO"];
  const benchmarkDates = market.series.benchmark.map((p) => p.date);
  assert.equal(benchmarkDates.at(-1), market.end);
  for (const ticker of tickers) {
    assert.ok(market.sources[ticker]?.provider, `${ticker} source`);
    const own = new Set(market.series[ticker].map((p) => p.date));
    assert.deepEqual(benchmarkDates.filter((d) => !own.has(d)), [], `${ticker} gaps`);
    assert.ok(market.series[ticker].every((p, i, all) => p.close > 0 && (!i || p.date > all[i - 1].date)), `${ticker} ordered`);
  }
});
