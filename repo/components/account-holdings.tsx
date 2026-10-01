"use client";
import { formatUnits } from "viem";
import { CANONICAL_TESTNET_TICKERS, ROBINHOOD_TESTNET } from "@/lib/chain/config";
import type { BasketValuation } from "@/lib/chain/valuation";
import { ASSETS } from "@/constants/baskets";
import { AssetLogo } from "./asset-label";
import styles from "./account-holdings.module.css";
import { pnl, usd } from "@/lib/chain/pnl.mjs";

export { pnl, usd };

/** Shows the tokens a Basket's ERC-6551 account holds, their market value and the position's P&L. */
export function AccountHoldings({ account, valuation }: { account: string; valuation: BasketValuation | null | undefined }) {
  if (valuation === null) return <p className={styles.note}>Holdings could not be read right now.</p>;
  if (!valuation) {
    return (
      <div className={styles.holdings} aria-busy="true" aria-label="Reading holdings from the Basket account">
        {[0, 1, 2].map((row) => <span key={row} className={`value-skeleton ${styles.skeletonRow}`} />)}
      </div>
    );
  }
  const result = pnl(valuation);
  return (
    <div className={styles.holdings}>
      <dl className={styles.pnl}>
        <div><dt>Invested</dt><dd className="mono">{usd(valuation.costBasis)}</dd></div>
        <div><dt>Market value</dt><dd className="mono">{usd(valuation.value)}</dd></div>
        <div><dt>Unrealized P&amp;L</dt><dd className={`mono ${result.change < BigInt(0) ? "negative" : "positive"}`}>{result.label}</dd></div>
      </dl>
      <div className={styles.head}>
        <span>Held in this Basket’s account</span>
        <a href={`${ROBINHOOD_TESTNET.explorer}/address/${account}`} target="_blank" rel="noreferrer">View onchain ↗</a>
      </div>
      <ul className={styles.list}>
        {valuation.holdings.map((holding) => (
          <li key={holding.token}>
            {ASSETS[holding.ticker] ? <AssetLogo ticker={holding.ticker} /> : <span className="asset-logo" aria-hidden="true" />}
            <span className={styles.name}>
              <strong>{holding.ticker}</strong>
              {(CANONICAL_TESTNET_TICKERS as readonly string[]).includes(holding.ticker)
                ? <small className={styles.canonical}>Canonical testnet token</small>
                : <small>Testnet mock</small>}
            </span>
            <span className={styles.amount}>
              <span className="mono">{Number(formatUnits(holding.amount, holding.decimals)).toLocaleString("en-US", { maximumSignificantDigits: 6 })}</span>
              <small className="mono">{holding.value === undefined ? "No published price" : usd(holding.value)}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.total}>
        <span>
          Valued at the last published prices
          {valuation.pricedAt ? ` · ${new Date(valuation.pricedAt * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}
        </span>
      </p>
    </div>
  );
}
