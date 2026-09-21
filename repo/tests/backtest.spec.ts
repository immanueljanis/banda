import { test, expect } from "@playwright/test";
import { backtest, maxDrawdown, historicalAsset } from "../lib/backtest";
import { BASKETS } from "../lib/mock";

test("catalog centralizes the five mandates, complete weights and fee tiers", () => {
  expect(BASKETS.map((basket) => basket.name)).toEqual([
    "NEURAL",
    "RAILS",
    "RESERVE",
    "FRONTIER",
    "FORTRESS",
  ]);
  expect(BASKETS.map((basket) => basket.managementFee)).toEqual([
    2, 2, 1, 2, 1,
  ]);
  for (const basket of BASKETS) {
    expect(
      basket.holdings.reduce((sum, holding) => sum + holding.weight, 0),
    ).toBe(100);
    expect(basket.holdings.some((holding) => holding.ticker === "USDG")).toBe(
      true,
    );
    expect(
      basket.allocation.reduce((sum, allocation) => sum + allocation.weight, 0),
    ).toBe(100);
  }
});

test("historical windows start equally, use ordered common dates and finite valuations", () => {
  for (const basket of BASKETS) {
    expect(basket.holdings.reduce((sum, h) => sum + h.weight, 0)).toBe(100);
    const lengths = [];
    for (const period of ["1W", "1M", "3M"] as const) {
      const points = backtest(basket, period);
      lengths.push(points.length);
      expect(points[0].basket).toBeCloseTo(10000, 8);
      expect(points[0].benchmark).toBeCloseTo(10000, 8);
      expect(points.at(-1)?.date).toBe("2025-09-11");
      for (const [i, point] of points.entries()) {
        expect(Number.isFinite(point.basket) && point.basket > 0).toBe(true);
        expect(Number.isFinite(point.benchmark) && point.benchmark > 0).toBe(
          true,
        );
        if (i) expect(point.date > points[i - 1].date).toBe(true);
      }
    }
    expect(lengths[0]).toBeLessThan(lengths[1]);
    expect(lengths[1]).toBeLessThan(lengths[2]);
  }
});
test("cash remains flat and drawdown measures peak-to-trough loss", () => {
  const cash = {
    ...BASKETS[0],
    holdings: [{ ...BASKETS[0].holdings[0], ticker: "USDG", weight: 100 }],
  };
  expect(backtest(cash, "3M").every((p) => p.basket === 10000)).toBe(true);
  expect(historicalAsset("USDG").change).toBe(0);
  expect(
    maxDrawdown(
      [100, 120, 90, 110].map((basket, i) => ({
        basket,
        date: String(i),
        benchmark: 100,
      })),
    ),
  ).toBe(-25);
});
