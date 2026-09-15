import snapshot from "./data/yield-snapshot.json";
import type { Basket } from "./mock";
export function yieldFor(ticker: string) {
  return snapshot.assets[ticker as keyof typeof snapshot.assets];
}
export function basketYield(basket: Basket) {
  return basket.holdings.reduce(
    (sum, h) => sum + ((yieldFor(h.ticker)?.apy ?? 0) * h.weight) / 100,
    0,
  );
}
export const yieldDate = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export const yieldSnapshotDate = snapshot.fetchedAt;
