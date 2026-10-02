import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registry = JSON.parse(
  await readFile(new URL("../../lib/data/market-feed-registry.json", import.meta.url)),
);
const basketsSource = await readFile(
  new URL("../../constants/baskets.ts", import.meta.url),
  "utf8",
);

const basketTickers = new Set(
  [...basketsSource.matchAll(/ticker:\s*"([A-Z]+)"/g)].map((match) => match[1]),
);
const registryTickers = new Set(Object.keys(registry.assets));

test("market feed registry covers every Basket holding exactly", () => {
  assert.deepEqual([...registryTickers].sort(), [...basketTickers].sort());
});

test("pending feed records cannot masquerade as verified addresses", () => {
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.sourceChain.chainId, 4663);
  assert.equal(registry.settlementAsset, "USDG");
  for (const [ticker, asset] of Object.entries(registry.assets)) {
    assert.match(ticker, /^[A-Z]+$/);
    assert.ok(["stock-token", "crypto", "stablecoin"].includes(asset.assetClass));
    assert.equal(asset.status, "feed-audit-pending");
    assert.equal(asset.feedProxy, null);
  }
});

test("every Basket allocation totals 100 percent", () => {
  const basketBodies = basketsSource.split(/\bbasket\(\{/).slice(1);
  assert.equal(basketBodies.length, 5);
  for (const body of basketBodies) {
    const holdings = body.split(/\n\s*\],/)[0];
    const weights = [...holdings.matchAll(/weight:\s*(\d+)/g)].map((match) => Number(match[1]));
    assert.equal(weights.reduce((sum, weight) => sum + weight, 0), 100);
  }
});
