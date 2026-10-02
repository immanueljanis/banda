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
