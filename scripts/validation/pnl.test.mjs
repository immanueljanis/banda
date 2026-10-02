import test from "node:test";
import assert from "node:assert/strict";
import { pnl, usd } from "../../lib/chain/pnl.mjs";

test("P&L compares market value with the USDG cost basis", () => {
  assert.deepEqual(pnl({ value: 512_340_000n, costBasis: 500_000_000n }), { change: 12_340_000n, percent: 2.468, direction: "up", label: "+$12.34 (+2.47%)" });
  assert.deepEqual(pnl({ value: 9_999_995n, costBasis: 10_000_000n }), { change: -5n, percent: 0, direction: "flat", label: "$0.00 (0.00%)" });
  assert.equal(pnl({ value: 9_990_000n, costBasis: 10_000_000n }).label, "−$0.01 (−0.10%)");
  assert.equal(pnl({ value: 450_000_000n, costBasis: 500_000_000n }).label, "−$50.00 (−10.00%)");
  assert.equal(pnl({ value: 0n, costBasis: 0n }).percent, 0);
  assert.equal(usd(1_234_567_890n), "$1,234.57");
});

test("simulated income accrues simple interest on the USDG portion since the last checkpoint", async () => {
  const { incomeEarned, incomePerYear, smallUsd } = await import("../../lib/chain/income.mjs");
  const year = 365 * 24 * 3600;
  assert.equal(incomeEarned(5_000_000n, 3.67, 1_000, 1_000 + year), 0.1835);
  assert.ok(Math.abs(incomeEarned(5_000_000n, 3.67, 1_000, 1_000 + 86_400) - 0.1835 / 365) < 1e-12);
  assert.equal(incomeEarned(5_000_000n, 3.67, undefined, 2_000), 0);
  assert.equal(incomeEarned(5_000_000n, 0, 1_000, 2_000), 0);
  assert.equal(incomeEarned(0n, 3.67, 1_000, 2_000), 0);
  assert.equal(incomeEarned(5_000_000n, 3.67, 3_000, 2_000), 0);
  assert.equal(incomePerYear(5_000_000n, 3.67), 0.1835);
  assert.equal(smallUsd(0.000503), "$0.0005");
  assert.equal(smallUsd(0.1835), "$0.18");
  assert.equal(smallUsd(0), "$0.00");
});

test("market value converts a token balance at a live USD price into USDG units", async () => {
  const { marketValue } = await import("../../lib/chain/pnl.mjs");
  assert.equal(marketValue(16_622_500_000_000_000n, 18, 752.0), 12_500_120n);
  assert.equal(marketValue(5_000_000n, 6, 1), 5_000_000n);
  assert.equal(marketValue(1n, 18, undefined), undefined);
  assert.equal(marketValue(1n, 18, 0), undefined);
});
