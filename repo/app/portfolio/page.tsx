"use client";
import Link from "next/link";
import { useWallet } from "@/components/wallet";
import { LiveChainStatus } from "@/components/live-chain-status";
import { RedeemPanel } from "@/components/redeem-panel";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { AccountHoldings, pnl, usd } from "@/components/account-holdings";
import { valueBasket, type BasketValuation } from "@/lib/chain/valuation";
import type { WalletPosition } from "@/components/wallet";
import { Rosette, WaveBand } from "@/components/guilloche";
/** Values every open Basket once per portfolio refresh; `null` marks a Basket that could not be read. */
function useValuations(positions: WalletPosition[], refreshKey: string) {
  const [valuations, setValuations] = useState<Record<string, BasketValuation | null>>({});
  useEffect(() => {
    let cancelled = false;
    setValuations({});
    for (const position of positions) {
      valueBasket(position.strategyId, position.account as Address, BigInt(position.shares))
        .then((valuation) => { if (!cancelled) setValuations((current) => ({ ...current, [position.tokenId]: valuation })); })
        .catch(() => { if (!cancelled) setValuations((current) => ({ ...current, [position.tokenId]: null })); });
    }
    return () => { cancelled = true; };
  }, [positions, refreshKey]);
  return valuations;
}

export default function Portfolio() {
  const wallet = useWallet();
  const valuations = useValuations(wallet.positions, `${wallet.portfolioBlock ?? ""}`);
  const ready = wallet.positions.length > 0 && wallet.positions.every((position) => valuations[position.tokenId]);
  const totals = ready
    ? wallet.positions.reduce((sum, position) => {
        const valuation = valuations[position.tokenId] as BasketValuation;
        return { value: sum.value + valuation.value, costBasis: sum.costBasis + valuation.costBasis };
      }, { value: BigInt(0), costBasis: BigInt(0) })
    : undefined;
  const loading = <span className="value-skeleton" aria-label="Loading" />;
  return (
    <main id="main">
      <section className="detail-note">
        <Rosette className="hero-rosette" />
        <div className="wrap detail-hero">
          <h1>Your Baskets.</h1>
          <p>Every Basket this wallet owns, read live from the blockchain. This is a test version with test money.</p>
        </div>
      </section>
      <div className="portfolio wrap">
      {!wallet.connected ? (
        <p>
          Connect your wallet to see your Baskets.{" "}
          <button
            className="wallet-button"
            onClick={wallet.connect}
            disabled={!wallet.ready || wallet.connecting}
          >
            {wallet.connecting ? "Opening login…" : "Connect wallet"}
          </button>
        </p>
      ) : wallet.portfolioStatus === "loading" ||
        wallet.portfolioStatus === "idle" ? (
        <div className="portfolio-loading" role="status" aria-live="polite">
          <span className="portfolio-loading-line" />
          <span className="portfolio-loading-line portfolio-loading-line-short" />
          <span className="sr-only">
            Loading your Baskets.
          </span>
        </div>
      ) : wallet.portfolioStatus === "error" ? (
        <div className="portfolio-notice" role="alert">
          <p>We could not load this wallet right now.</p>
          <p className="muted">{wallet.error}</p>
          <button
            className="secondary-button"
            onClick={wallet.refreshPortfolio}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="portfolio-summary">
            <div>
              <span className="eyebrow">AVAILABLE USDG</span>
              <strong className="portfolio-balance mono">
                {wallet.balanceLabel}
              </strong>
            </div>
            <div className="portfolio-source">
              <span>{wallet.walletName ?? "Connected wallet"}</span>
              <span className="mono">{wallet.address}</span>
              {wallet.portfolioBlock ? (
                <span>
                  Up to date as of block{" "}
                  <span className="mono">
                    {Number(wallet.portfolioBlock).toLocaleString("en-US")}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          {wallet.positions.length > 0 ? (
            <dl className="portfolio-performance">
              <div><dt>Invested</dt><dd className="mono">{totals ? usd(totals.costBasis) : loading}</dd></div>
              <div><dt>Worth now</dt><dd className="mono">{totals ? usd(totals.value) : loading}</dd></div>
              <div>
                <dt>Profit / loss so far</dt>
                <dd className={`mono ${totals && totals.value < totals.costBasis ? "negative" : "positive"}`}>{totals ? pnl(totals).label : loading}</dd>
              </div>
              <div>
                <dt>Income earned</dt>
                <dd className="mono">$0.00</dd>
                <small>None on this test version: the income portion holds test USDG, and practice versions pay no dividends.</small>
              </div>
            </dl>
          ) : null}
          {wallet.positions.length === 0 ? (
            <div className="portfolio-empty">
              <h2>No Baskets yet.</h2>
              <p>
                This wallet has no Banda Baskets right now. When you withdraw
                everything from a Basket, it closes and no longer shows here.
              </p>
              <Link className="empty-link" href="/#baskets">
                Explore Baskets →
              </Link>
            </div>
          ) : (
            <div className="portfolio-list">
              {wallet.positions.map((p) => (
                <article className="portfolio-item certificate" key={p.tokenId}>
                  <WaveBand className="certificate-wave" />
                  <div className="portfolio-item-body">
                  <div className="portfolio-item-head">
                    <span className="certificate-kind">Basket certificate</span>
                    <span className="certificate-serial mono">No. {p.tokenId}</span>
                  </div>
                  <h2>{p.name}</h2>
                  <p>
                    <span className="mono">{p.displayShares}</span> units
                  </p>
                  <p className="muted">
                    Vault address <span className="mono">{p.account}</span>
                  </p>
                  {p.slug !== "unknown" ? (
                    <>
                    <Link className="primary-button" href={`/basket/${p.slug}`}>
                      View Basket ↗
                    </Link>
                    <AccountHoldings account={p.account} valuation={valuations[p.tokenId]} />
                    <RedeemPanel position={p} valuation={valuations[p.tokenId] ?? undefined} />
                    </>
                  ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <p className="muted">
        Your balance and Baskets are read from the Robinhood Chain test
        network. This is a test version with test money. Nothing here has real
        value. Banda never sees your wallet’s private key.
      </p>
      <LiveChainStatus />
      </div>
    </main>
  );
}
