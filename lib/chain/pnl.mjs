/** Formats 6-decimal USDG base units as US dollars. */
export const usd = value => (Number(value) / 1e6).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Changes under half a cent, such as rounding dust, are shown as flat rather than as a loss or gain. */
const FLAT_BELOW = 5_000n;

/**
 * Unrealized P&L of an open position: market value minus the USDG it cost, with a signed dollar and
 * percent label and a direction for colouring. Percent uses integer maths to avoid float drift.
 */
export function pnl({ value, costBasis }) {
  const change = value - costBasis;
  const magnitude = change < 0n ? -change : change;
  if (magnitude < FLAT_BELOW) return { change, percent: 0, direction: "flat", label: "$0.00 (0.00%)" };
  const percent = costBasis > 0n ? Number(change * 1_000_000n / costBasis) / 10_000 : 0;
  const sign = change < 0n ? "−" : "+";
  return { change, percent, direction: change < 0n ? "down" : "up", label: `${sign}${usd(magnitude)} (${sign}${Math.abs(percent).toFixed(2)}%)` };
}

/** CSS class for a P&L direction. */
export const pnlTone = direction => (direction === "down" ? "negative" : direction === "up" ? "positive" : "muted");
