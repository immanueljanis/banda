import market from "./data/market-history.json";
import type { Basket } from "@/constants/baskets";
export type Period = "1W" | "1M" | "3M";
export const periodDays: Record<Period, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 92,
};
export type HistoryPoint = { date: string; basket: number; benchmark: number };
export function backtest(basket: Basket, period: Period): HistoryPoint[] {
  const series = market.series as Record<
    string,
    { date: string; close: number }[]
  >;
  const end = Date.parse(market.end);
  const dates = series.benchmark
    .map((p) => p.date)
    .filter(
      (date) =>
        Date.parse(date) >= end - periodDays[period] * 86400000 &&
        Date.parse(date) <= end,
    );
  const price = (ticker: string, date: string) => {
    if (ticker === "USDG") return 1;
    const point = series[ticker]?.find((p) => p.date === date);
    if (!point) throw new Error(`Missing ${ticker} price on ${date}`);
    return point.close;
  };
  const first = dates[0];
  return dates.map((date) => ({
    date,
    basket:
      10000 *
      basket.holdings.reduce(
        (sum, h) =>
          sum +
          ((h.weight / 100) * price(h.ticker, date)) / price(h.ticker, first),
        0,
      ),
    benchmark: (10000 * price("benchmark", date)) / price("benchmark", first),
  }));
}
export function historicalAsset(ticker: string) {
  const points =
    ticker === "USDG"
      ? market.series.benchmark.map((p) => ({ date: p.date, close: 1 }))
      : (market.series as Record<string, { date: string; close: number }[]>)[
          ticker
        ];
  const recent = points.filter((p) => p.date <= market.end).slice(-30);
  const last = recent.at(-1)!,
    previous = recent.at(-2)!;
  return {
    points: recent,
    price: last.close,
    change: (last.close / previous.close - 1) * 100,
    date: last.date,
  };
}
export function maxDrawdown(points: HistoryPoint[]) {
  let peak = points[0].basket,
    drawdown = 0;
  for (const point of points) {
    peak = Math.max(peak, point.basket);
    drawdown = Math.min(drawdown, point.basket / peak - 1);
  }
  return drawdown * 100;
}
export const dataPeriod = { start: market.start, end: market.end };
