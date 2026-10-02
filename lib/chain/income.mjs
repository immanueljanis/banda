const YEAR_SECONDS = 365 * 24 * 3600;

/**
 * Simulated income on a Basket's USDG portion: simple interest at `apyPercent` on `incomeValue`
 * (6-decimal USDG units) from `sinceSeconds` (the Basket's last deposit or withdrawal) to `nowSeconds`.
 * Returns USDG as a number; a missing start, rate or value earns nothing.
 */
export function incomeEarned(incomeValue, apyPercent, sinceSeconds, nowSeconds) {
  if (!incomeValue || !(apyPercent > 0) || !sinceSeconds || nowSeconds <= sinceSeconds) return 0;
  return (Number(incomeValue) / 1e6) * (apyPercent / 100) * ((nowSeconds - sinceSeconds) / YEAR_SECONDS);
}

/** Yearly income at today's rate, in USDG. */
export const incomePerYear = (incomeValue, apyPercent) => (apyPercent > 0 ? (Number(incomeValue) / 1e6) * (apyPercent / 100) : 0);

/** Dollars with enough decimals that sub-cent income stays visible ($0.0005 rather than $0.00). */
export const smallUsd = value =>
  value === 0 ? "$0.00" : value < 0.01
    ? `$${value.toLocaleString("en-US", { maximumSignificantDigits: 2 })}`
    : value.toLocaleString("en-US", { style: "currency", currency: "USD" });
