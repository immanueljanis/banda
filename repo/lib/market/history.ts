import market from "@/lib/data/market-history.json";
import {
  maxDrawdown,
  quote,
  simulate,
  windowDates,
  type Close,
  type HistoryPoint,
} from "./backtest.mjs";

export { maxDrawdown, type HistoryPoint };
export type Period = "1W" | "1M" | "3M" | "6M";
export const PERIODS: Period[] = ["1W", "1M", "3M", "6M"];
export const periodDays: Record<Period, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 92,
  "6M": 184,
};
const series = market.series as Record<string, Close[]>;
const tradingDates = series.benchmark.map((p) => p.date);

/** Real-price backtest of the given weights over a trailing window ending on the dataset's last close. */
export function backtest(
  holdings: { ticker: string; weight: number }[],
  period: Period,
): HistoryPoint[] {
  return simulate(
    holdings,
    series,
    windowDates(series.benchmark, market.end, periodDays[period]),
  );
}

/** Latest real close, change versus the prior close and the last thirty closes of one asset. */
export function historicalAsset(ticker: string) {
  return quote(series, ticker, tradingDates);
}

/** Provider and symbol behind an asset's history, for as-of labels. */
export function assetSource(ticker: string) {
  return (market.sources as Record<string, { provider: string }>)[ticker]
    ?.provider;
}

export const dataPeriod = {
  start: tradingDates[0],
  end: market.end,
  fetchedAt: market.fetchedAt,
};
