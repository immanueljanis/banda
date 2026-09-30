import test from "node:test";
import assert from "node:assert/strict";
import { CHAINLINK_FEEDS, USDG_USD_FEED, chainlinkUsd, createMarketPrices, usdToUsdg } from "../../lib/nav/prices.mjs";

const NOW = 2_000_000_000;
const round = (answer, age = 60) => [10n, answer, 0n, BigInt(NOW - age), 10n];

test("Chainlink rounds must be positive, complete and inside the heartbeat window", () => {
  assert.equal(chainlinkUsd("ETH", round(2_670_00000000n), NOW), 2_670_00000000n);
  assert.equal(chainlinkUsd("ETH", round(0n), NOW), undefined);
  assert.equal(chainlinkUsd("ETH", [10n, 1n, 0n, BigInt(NOW), 9n], NOW), undefined);
  assert.equal(chainlinkUsd("ETH", round(1n, 27 * 3600), NOW), undefined);
  assert.equal(chainlinkUsd("NVDA", round(230_00000000n, 70 * 3600), NOW), 230_00000000n);
  assert.equal(chainlinkUsd("NVDA", round(230_00000000n, 81 * 3600), NOW), undefined);
});

test("USD prices are normalized into 6-decimal USDG through the USDG/USD rate", () => {
  assert.equal(usdToUsdg(230_00000000n, 100_000000n), 230_000_000n);
  assert.equal(usdToUsdg(100_00000000n, 100_500000n), 99_502_487n);
});

test("market prices combine Chainlink and CoinGecko and drop anything that fails a check", async () => {
  const rounds = { [USDG_USD_FEED]: round(100_000000n, 85_000), [CHAINLINK_FEEDS.NVDA.proxy]: round(230_00000000n), [CHAINLINK_FEEDS.ETH.proxy]: round(2_670_00000000n, 30 * 3600) };
  const fetchImpl = async () => ({ ok: true, json: async () => ({ solana: { usd: 118.19, last_updated_at: NOW - 30 }, bittensor: { usd: 301.7, last_updated_at: NOW - 3_600 } }) });
  const prices = await createMarketPrices({ readRound: async address => rounds[address], fetchImpl, now: () => NOW })(["NVDA", "ETH", "SOL", "TAO"]);
  assert.deepEqual([...prices.entries()], [["NVDA", 230_000_000n], ["SOL", 118_190_000n]]);
});

test("a depegged USDG pauses every price", async () => {
  const readRound = async () => round(97_000000n);
  await assert.rejects(createMarketPrices({ readRound, now: () => NOW })(["NVDA"]), { code: "PRICE_UNAVAILABLE" });
});
