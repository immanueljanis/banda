/** @typedef {{ date: string; close: number }} Close */
/** @typedef {{ ticker: string; weight: number }} Weight */
/** @typedef {{ date: string; basket: number; benchmark: number }} HistoryPoint */

export const START_VALUE = 10_000;
const DAY = 86_400_000;

/**
 * Last close on or before `date` (series sorted ascending), carrying the previous close across a missing day.
 * USDG is always $1. Returns undefined when the series has no close at or before the date.
 * @param {Record<string, Close[]>} series @param {string} ticker @param {string} date
 */
export function priceOn(series, ticker, date) {
  if (ticker === "USDG") return 1;
  let found;
  for (const point of series[ticker] ?? []) {
    if (point.date > date) break;
    found = point.close;
  }
  return found;
}

/**
 * Benchmark trading dates within the last `days` calendar days up to and including `end`.
 * @param {Close[]} benchmark @param {string} end @param {number} days
 */
export function windowDates(benchmark, end, days) {
  const from = Date.parse(end) - days * DAY;
  return benchmark.map((p) => p.date).filter((date) => Date.parse(date) >= from && date <= end);
}

/**
 * Buy-and-hold backtest: $10,000 split by weight at the first date's closes, fixed quantities afterwards,
 * no rebalancing, fees or yield. The benchmark is normalized to $10,000 on the same date.
 * @param {Weight[]} holdings @param {Record<string, Close[]>} series @param {string[]} dates
 * @returns {HistoryPoint[]}
 */
export function simulate(holdings, series, dates) {
  const total = holdings.reduce((sum, h) => sum + h.weight, 0);
  const first = dates[0];
  const units = holdings.map((h) => {
    const price = priceOn(series, h.ticker, first);
    if (!price) throw new Error(`Missing ${h.ticker} price on ${first}`);
    return { ticker: h.ticker, units: (START_VALUE * h.weight) / total / price };
  });
  const benchmarkStart = priceOn(series, "benchmark", first);
  if (!benchmarkStart) throw new Error(`Missing benchmark price on ${first}`);
  return dates.map((date) => ({
    date,
    basket: units.reduce((sum, u) => sum + u.units * /** @type {number} */ (priceOn(series, u.ticker, date)), 0),
    benchmark: (START_VALUE * /** @type {number} */ (priceOn(series, "benchmark", date))) / benchmarkStart,
  }));
}

/**
 * Latest close, change versus the previous close and the last `count` closes for one asset.
 * @param {Record<string, Close[]>} series @param {string} ticker @param {string[]} dates @param {number} count
 */
export function quote(series, ticker, dates, count = 30) {
  const points = (ticker === "USDG" ? dates.map((date) => ({ date })) : series[ticker])
    .filter((p) => p.date <= dates.at(-1))
    .slice(-count)
    .map((p) => ({ date: p.date, close: /** @type {number} */ (priceOn(series, ticker, p.date)) }));
  const last = points.at(-1), previous = points.at(-2) ?? last;
  return { points, price: last.close, change: (last.close / previous.close - 1) * 100, date: last.date };
}

/** Largest peak-to-trough decline of the basket line, in percent (negative). @param {HistoryPoint[]} points */
export function maxDrawdown(points) {
  let peak = points[0].basket, drawdown = 0;
  for (const point of points) {
    peak = Math.max(peak, point.basket);
    drawdown = Math.min(drawdown, point.basket / peak - 1);
  }
  return drawdown * 100;
}
