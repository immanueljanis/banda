/** Formats 6-decimal USDG base units as US dollars. */
export const usd = value => (Number(value) / 1e6).toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * Unrealized P&L of an open position: market value minus the USDG it cost, with a signed dollar and
 * percent label. Percent is computed in integer basis points of a basis point to avoid float drift.
 */
export function pnl({ value, costBasis }) {
  const change = value - costBasis;
  const percent = costBasis > 0n ? Number(change * 1_000_000n / costBasis) / 10_000 : 0;
  const sign = change < 0n ? "−" : "+";
  return { change, percent, label: `${sign}${usd(change < 0n ? -change : change)} (${sign}${Math.abs(percent).toFixed(2)}%)` };
}
