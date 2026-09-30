"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ASSETS, type Basket, money } from "@/constants/baskets";
import {
  PERIODS,
  assetSource,
  backtest,
  dataPeriod,
  historicalAsset,
  maxDrawdown,
  type Period,
} from "@/lib/market/history";
import { AssetLabel } from "./asset-label";
import { AssetFacts, BasketFeatures } from "./asset-facts";
const TABS = [
  "About",
  "Historical",
  "Rebalances",
  "Risk",
  "Resources",
] as const;
type Tab = (typeof TABS)[number];
type LivePrice = { price: number; updatedAt: string; source: string };
const percent = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const longDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export function BasketExplorer({ basket }: { basket: Basket }) {
  const [tab, setTab] = useState<Tab>("About");
  const [period, setPeriod] = useState<Period>("3M");
  const [selected, setSelected] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [live, setLive] = useState<Record<string, LivePrice>>({});
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/market", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { prices: {} }))
      .then((body) => setLive(body.prices ?? {}))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const history = backtest(basket.holdings, period);
  const end = history.at(-1)!;
  const active = basket.holdings.find((h) => h.ticker === selected);
  return (
    <div className="basket-explorer">
      <div
        className="basket-tabs"
        role="tablist"
        aria-label="Basket information"
      >
        {TABS.map((name, i) => (
          <button
            key={name}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`tab-${name}`}
            role="tab"
            aria-selected={tab === name}
            aria-controls={`panel-${name}`}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => setTab(name)}
            onKeyDown={(e) => {
              let next = i;
              if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
              else if (e.key === "ArrowLeft")
                next = (i + TABS.length - 1) % TABS.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = TABS.length - 1;
              else return;
              e.preventDefault();
              setTab(TABS[next]);
              tabRefs.current[next]?.focus();
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <section
        className="basket-tab-panel"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "About" && (
          <>
            <div className="panel-heading">
              <h2>What’s inside</h2>
              <span className="muted">
                {basket.holdings.length} assets, one basket
              </span>
            </div>
            <div className="allocation-overview">
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={basket.holdings.map((h) => ({
                        ...h,
                        name: ASSETS[h.ticker].name,
                      }))}
                      dataKey="weight"
                      nameKey="name"
                      innerRadius="65%"
                      outerRadius="88%"
                      paddingAngle={2}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive={false}
                      onMouseEnter={(_, i) =>
                        setSelected(basket.holdings[i].ticker)
                      }
                      onMouseLeave={() => setSelected(null)}
                    >
                      {basket.holdings.map((h) => (
                        <Cell
                          key={h.ticker}
                          fill={ASSETS[h.ticker].color}
                          opacity={selected && selected !== h.ticker ? 0.4 : 1}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong className="mono">
                    {active ? `${active.weight}%` : "100%"}
                  </strong>
                  <span>
                    {active ? ASSETS[active.ticker].name : "Your portfolio"}
                  </span>
                </div>
              </div>
              <div className="donut-legend">
                {basket.holdings.map((h) => (
                  <button
                    className="allocation-key"
                    key={h.ticker}
                    onMouseEnter={() => setSelected(h.ticker)}
                    onMouseLeave={() => setSelected(null)}
                    onFocus={() => setSelected(h.ticker)}
                    onBlur={() => setSelected(null)}
                    onClick={() =>
                      setSelected(selected === h.ticker ? null : h.ticker)
                    }
                    aria-pressed={selected === h.ticker}
                  >
                    <i style={{ background: ASSETS[h.ticker].color }} />
                    <span>{ASSETS[h.ticker].name}</span>
                    <b className="mono">{h.weight}%</b>
                  </button>
                ))}
              </div>
            </div>
            <BasketFeatures basket={basket} />
            <div className="holdings-heading">
              <h3>The assets</h3>
              <span>
                Daily close ·{" "}
                <span className="mono">{longDate(dataPeriod.end)}</span>
              </span>
            </div>
            <div className="asset-card-grid">
              {basket.holdings.map((h) => {
                const asset = historicalAsset(h.ticker);
                const values = asset.points.map((p) => p.close),
                  min = Math.min(...values),
                  max = Math.max(...values);
                const quote = live[h.ticker];
                const change = quote
                  ? (quote.price / asset.price - 1) * 100
                  : asset.change;
                const up = change >= 0;
                return (
                  <article className="asset-card" key={h.ticker}>
                    <AssetLabel ticker={h.ticker} />
                    <AssetFacts ticker={h.ticker} />
                    <div className="asset-card-price">
                      <strong className="mono">
                        {money(quote?.price ?? asset.price)}
                      </strong>
                      <span className={`mono ${up ? "positive" : "negative"}`}>
                        {percent(change)}
                        <small>
                          {quote
                            ? ` vs ${longDate(asset.date)} close`
                            : " daily close"}
                        </small>
                      </span>
                    </div>
                    {h.ticker !== "USDG" && (
                      <small className="asset-proxy-note">
                        {quote ? (
                          <>
                            Live · {quote.source} ·{" "}
                            <span className="mono">
                              {longDate(quote.updatedAt.slice(0, 10))}{" "}
                              {quote.updatedAt.slice(11, 16)} UTC
                            </span>
                          </>
                        ) : (
                          <>
                            {assetSource(h.ticker)} close ·{" "}
                            <span className="mono">{longDate(asset.date)}</span>
                          </>
                        )}
                      </small>
                    )}
                    <svg
                      className={`asset-history ${up ? "positive" : "negative"}`}
                      viewBox="0 0 250 54"
                      role="img"
                      aria-label={`${ASSETS[h.ticker].name} historical price, last thirty daily observations`}
                    >
                      <path d="M0 51H250" stroke="var(--rule)" />
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        points={values
                          .map(
                            (v, i) =>
                              `${(i / (values.length - 1)) * 250},${max === min ? 27 : 47 - ((v - min) / (max - min)) * 40}`,
                          )
                          .join(" ")}
                      />
                    </svg>
                    <div className="asset-card-allocation">
                      <span>Portfolio share</span>
                      <strong className="mono">{h.weight}%</strong>
                    </div>
                    {h.ticker === "USDG" && (
                      <small className="asset-proxy-note">
                        Cash price held at $1; candidate vault yield excluded.
                      </small>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === "Historical" && (
          <>
            <div className="panel-heading">
              <h2>Historical comparison</h2>
              <div className="periods">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    aria-pressed={period === p}
                    onClick={() => setPeriod(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <p className="chart-intro">
              What a hypothetical <span className="mono">$10,000</span> Basket
              would have done on real historical prices.
            </p>
            <div className="comparison-summary">
              <div>
                <span>
                  <i className="series-line" />
                  {basket.name}
                </span>
                <strong className="mono">{money(end.basket)}</strong>
                <small
                  className={
                    end.basket >= 10000 ? "positive mono" : "negative mono"
                  }
                >
                  {percent((end.basket / 10000 - 1) * 100)}
                </small>
              </div>
              <div>
                <span>
                  <i className="series-line benchmark" />
                  S&amp;P <span className="mono">500</span>
                </span>
                <strong className="mono">{money(end.benchmark)}</strong>
                <small
                  className={
                    end.benchmark >= 10000 ? "positive mono" : "negative mono"
                  }
                >
                  {percent((end.benchmark / 10000 - 1) * 100)}
                </small>
              </div>
            </div>
            <div
              className="backtest-chart"
              role="img"
              aria-label={`${period} backtested portfolio versus S&P 500, both starting at 10000 dollars`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history}
                  margin={{ top: 15, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--rule)"
                    strokeDasharray="2 5"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(`${date}T00:00:00Z`).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", timeZone: "UTC" },
                      )
                    }
                    tick={{
                      fontSize: 10,
                      fill: "var(--muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={45}
                  />
                  <YAxis
                    width={52}
                    tickFormatter={(n) => `${Number((n / 1000).toFixed(1))}k`}
                    domain={["auto", "auto"]}
                    tick={{
                      fontSize: 10,
                      fill: "var(--muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="chart-tooltip">
                          <strong>{label}</strong>
                          {payload.map((p) => (
                            <div key={String(p.dataKey)}>
                              {p.dataKey === "basket" ? basket.name : "S&P 500"}
                              : {money(Number(p.value))}
                            </div>
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  <Line
                    dataKey="basket"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="benchmark"
                    stroke="var(--benchmark)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="historical-dates mono">
              {history[0].date} to {end.date}
            </p>
            <p className="backtest-disclaimer">
              Hypothetical backtest on real historical closing prices, using
              today’s weights, before fees. This is not Banda’s live
              performance and does not predict future results.
            </p>
            <details className="methodology">
              <summary>Methodology &amp; data sources</summary>
              <p>
                Each selected window starts at{" "}
                <span className="mono">$10,000</span> at the first close of the
                window, split by the Basket’s current weights, then holds fixed
                quantities without rebalancing. Changing the window starts a
                fresh simulation. Data runs from{" "}
                <span className="mono">{dataPeriod.start}</span> to{" "}
                <span className="mono">{dataPeriod.end}</span>, fetched{" "}
                <span className="mono">{dataPeriod.fetchedAt.slice(0, 10)}</span>.
              </p>
              <p>
                Daily closes matched on S&amp;P <span className="mono">500</span>{" "}
                trading dates; a missing close carries the previous close
                forward. Crypto closes at midnight UTC, equities at the US
                market close. The benchmark is the S&amp;P{" "}
                <span className="mono">500</span> price index (^GSPC),
                excluding dividends.
              </p>
              <p>
                Equities, ETFs, ETH, BTC and LINK use Yahoo Finance closes of
                the markets their Robinhood Chain Chainlink feeds track; SOL,
                TAO, NEAR and RENDER use CoinGecko, the same source Banda’s price
                publisher uses for them. USDG is held at{" "}
                <span className="mono">$1</span> without yield. Prices reflect
                market behavior, not a verified strategy execution or Robinhood
                Stock Token liquidity.
              </p>
              <p>
                The {basket.managementFee}% annual management fee, trading
                costs, slippage, taxes and additional lending rewards are
                excluded. The MVP has no performance fee. Current example
                weights are applied retrospectively, introducing selection bias.
                Returns do not predict future results.
              </p>
              <div className="source-links">
                <a
                  href="https://finance.yahoo.com/quote/%5EGSPC/history/"
                  target="_blank"
                  rel="noreferrer"
                >
                  S&amp;P 500 data ↗
                </a>
                <a href="/data/market-history.json" download>
                  Download source prices ↓
                </a>
              </div>
            </details>
          </>
        )}
        {tab === "Rebalances" && (
          <>
            <div className="panel-heading">
              <h2>Changes to the basket</h2>
            </div>
            <div className="rebalance-empty">
              <span className="empty-rule" />
              <h3>No rebalances recorded.</h3>
              <p>
                When the portfolio’s mix changes, you’ll see what changed, when
                it happened, and why.
              </p>
            </div>
            <div className="plain-note">
              <h3>How rebalancing works</h3>
              <p>
                The manager adjusts the mix of assets to keep the basket aligned
                with its strategy. The historical comparison assumes no
                rebalancing; it is not an execution log.
              </p>
            </div>
          </>
        )}
        {tab === "Risk" && (
          <>
            <div className="panel-heading">
              <h2>Know what you’re holding.</h2>
              <span className="risk-label">
                {basket.character === "Defensive"
                  ? "Capital at risk"
                  : "Higher volatility"}
              </span>
            </div>
            <p className="risk-intro">
              {basket.mandate} Its {basket.character.toLowerCase()} profile can
              still lose value, and diversification cannot prevent losses.
            </p>
            <div className="risk-observation">
              <span>
                Largest decline from a peak in the six-month simulation
              </span>
              <strong className="mono negative">
                {maxDrawdown(backtest(basket.holdings, "6M")).toFixed(2)}%
              </strong>
              <small>
                Historical model, before fees. Future losses can be larger.
              </small>
            </div>
            {[
              [
                "Market movements",
                "Prices can fall sharply. You may receive less than you invested.",
              ],
              [
                "Underlying platforms",
                "A failure in a lending, staking or custody provider can affect the assets held by the basket.",
              ],
              [
                "Access to your money",
                "Low liquidity or unavailable price feeds can delay selling. Redeeming underlying holdings does not guarantee an immediate cash exit.",
              ],
              [
                "Portfolio management",
                "The manager controls defined portfolio actions. The final operator and security setup must be settled before launch.",
              ],
            ].map(([title, description]) => (
              <div className="risk-row" key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </>
        )}
        {tab === "Resources" && (
          <>
            <div className="panel-heading">
              <h2>A closer look.</h2>
            </div>
            <Link className="resource-row" href="/docs">
              <div>
                <h3>Banda methodology</h3>
                <p>Ownership, pricing, fees and redemption.</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
            <a
              className="resource-row"
              href="/data/market-history.json"
              download
            >
              <div>
                <h3>Historical price data</h3>
                <p>Download the source data used in the comparison.</p>
              </div>
              <span aria-hidden="true">↓</span>
            </a>
            <h3 className="resources-subheading">Meet the assets</h3>
            {basket.holdings.map((h) => (
              <a
                className="resource-row"
                key={h.ticker}
                href={ASSETS[h.ticker].url}
                target="_blank"
                rel="noreferrer"
              >
                <div>
                  <h3>
                    {ASSETS[h.ticker].name}{" "}
                    <span className="mono">{h.ticker}</span>
                  </h3>
                  <p>Official project documentation</p>
                </div>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
