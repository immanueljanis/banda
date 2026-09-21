import {
  YIELD_SNAPSHOTS,
  yieldSnapshotDate,
  type Basket,
} from "@/constants/baskets";
export function yieldFor(ticker: string) {
  return YIELD_SNAPSHOTS[ticker];
}
export function basketYield(basket: Basket) {
  return basket.holdings.reduce(
    (sum, h) => sum + ((yieldFor(h.ticker)?.apy ?? 0) * h.weight) / 100,
    0,
  );
}
export function yieldWeight(basket: Basket) {
  return basket.holdings.reduce(
    (sum, holding) => sum + (yieldFor(holding.ticker) ? holding.weight : 0),
    0,
  );
}
export function yieldAssets(basket: Basket) {
  return basket.holdings
    .filter((holding) => yieldFor(holding.ticker))
    .map((holding) => holding.ticker);
}
export const yieldDate = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export { yieldSnapshotDate };
