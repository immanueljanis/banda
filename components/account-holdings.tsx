"use client";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { ROBINHOOD_TESTNET } from "@/lib/chain/config";
import type { BasketValuation } from "@/lib/chain/valuation";
import { ASSETS } from "@/constants/baskets";
import { AssetLogo } from "./asset-label";
import styles from "./account-holdings.module.css";
import { pnl, pnlTone, usd } from "@/lib/chain/pnl.mjs";
import { incomeEarned, smallUsd } from "@/lib/chain/income.mjs";

export { pnl, pnlTone, usd };

/** Yearly rate (percent) the income portion is simulated at, read once from /api/yield. */
export function useIncomeRate() {
  const [apy, setApy] = useState<number>();
  useEffect(() => {
    let cancelled = false;
    fetch("/api/yield").then((response) => response.json()).then((body) => { if (!cancelled && body.apy > 0) setApy(body.apy); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return apy;
}

/** Current Unix time in seconds, refreshed every second so accruing income visibly ticks. */
export function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const amountLabel = (amount: bigint, decimals: number) =>
  Number(formatUnits(amount, decimals)).toLocaleString("en-US", { maximumSignificantDigits: 4 });

/** Shows what a Basket's ERC-6551 vault holds: one line per asset, largest value first, with its share of the Basket. */
export function AccountHoldings({ account, valuation, apy, now }: { account: string; valuation: BasketValuation | null | undefined; apy?: number; now: number }) {
  if (valuation === null) return <p className={styles.note}>Holdings could not be read right now.</p>;
  if (!valuation) {
    return (
      <div className={styles.holdings} aria-busy="true" aria-label="Loading what your Basket’s vault holds">
        {[0, 1, 2].map((row) => <span key={row} className={`value-skeleton ${styles.skeletonRow}`} />)}
      </div>
    );
  }
  const total = valuation.value;
  const share = (value?: bigint) => value === undefined || total === BigInt(0) ? 0 : Number(value * BigInt(10_000) / total) / 100;
  const holdings = [...valuation.holdings].sort((a, b) => share(b.value) - share(a.value));
  return (
    <div className={styles.holdings}>
      <h4 className={styles.title}>What you own</h4>
      <div className={styles.bar} aria-hidden="true">
        {holdings.map((holding) => (
          <span key={holding.token} style={{ flexGrow: share(holding.value), background: ASSETS[holding.ticker]?.color ?? "var(--muted)" }} />
        ))}
      </div>
      <ul className={styles.list}>
        {holdings.map((holding) => (
          <li key={holding.token}>
            {ASSETS[holding.ticker] ? <AssetLogo ticker={holding.ticker} /> : <span className="asset-logo" aria-hidden="true" />}
            <span className={styles.name}>
              <strong>{holding.ticker}</strong>
              <small>{holding.ticker === "USDG" ? `Income · ${apy ? `${apy.toFixed(2)}% a year` : "earning interest"}` : ASSETS[holding.ticker]?.name}</small>
            </span>
            {holding.ticker === "USDG" && apy
              ? <span className={`mono ${styles.earned}`}>+{smallUsd(incomeEarned(holding.value, apy, valuation.since, now))} earned</span>
              : <span className={`mono ${styles.units}`}>{amountLabel(holding.amount, holding.decimals)}</span>}
            <span className={`mono ${styles.weight}`}>{share(holding.value).toFixed(0)}%</span>
            <strong className={`mono ${styles.value}`}>{holding.value === undefined ? "No price" : usd(holding.value)}</strong>
          </li>
        ))}
      </ul>
      <p className={styles.footnote}>
        <span>
          Practice versions at live market prices
          {valuation.pricedAt ? ` · ${new Date(valuation.pricedAt * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}
        </span>
        <a href={`${ROBINHOOD_TESTNET.explorer}/address/${account}`} target="_blank" rel="noreferrer">View vault onchain ↗</a>
      </p>
    </div>
  );
}
