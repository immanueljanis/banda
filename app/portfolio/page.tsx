"use client";
import Link from "next/link";
import { useWallet } from "@/components/wallet";
import { LiveChainStatus } from "@/components/live-chain-status";
import { RedeemPanel } from "@/components/redeem-panel";
import { useEffect, useState } from "react";
import { BASKETS } from "@/constants/baskets";
import type { Address } from "viem";
import { AccountHoldings, atLivePrices, pnl, pnlTone, usd, useIncomeRate, useLivePrices, useNow } from "@/components/account-holdings";
import { incomeEarned, incomePerYear, smallUsd } from "@/lib/chain/income.mjs";
import { valueBasket, type BasketValuation } from "@/lib/chain/valuation";
import type { WalletPosition } from "@/components/wallet";
import { Rosette } from "@/components/guilloche";
/** Values every open Basket once per portfolio refresh; `null` marks a Basket that could not be read. */
function useValuations(positions: WalletPosition[], refreshKey: string) {
  const [valuations, setValuations] = useState<Record<string, BasketValuation | null>>({});
  useEffect(() => {
    let cancelled = false;
    setValuations({});
    for (const position of positions) {
      valueBasket(position.strategyId, position.account as Address, BigInt(position.shares), BigInt(position.tokenId))
        .then((valuation) => { if (!cancelled) setValuations((current) => ({ ...current, [position.tokenId]: valuation })); })
        .catch(() => { if (!cancelled) setValuations((current) => ({ ...current, [position.tokenId]: null })); });
    }
    return () => { cancelled = true; };
  }, [positions, refreshKey]);
  return valuations;
}

/** Groups open Baskets by theme in catalogue order, so several Baskets of one theme read as one position. */
function groupByTheme(positions: WalletPosition[]) {
  return BASKETS.map((basket) => ({
    slug: basket.slug,
    name: basket.name,
    theme: basket.thesis,
    items: positions.filter((position) => position.slug === basket.slug),
  })).filter((group) => group.items.length > 0);
}

/** Totals invested and current value for a set of Baskets once every one of them has been valued. */
function sumValuations(items: WalletPosition[], valuations: Record<string, BasketValuation | null>) {
  if (!items.every((item) => valuations[item.tokenId])) return undefined;
  return items.reduce((sum, item) => {
    const valuation = valuations[item.tokenId] as BasketValuation;
    return { value: sum.value + valuation.value, costBasis: sum.costBasis + valuation.costBasis };
  }, { value: BigInt(0), costBasis: BigInt(0) });
}

/** Simulated income for a set of Baskets once every one of them has been valued and the rate is known. */
function sumIncome(items: WalletPosition[], valuations: Record<string, BasketValuation | null>, apy: number | undefined, now: number) {
  if (!apy || !items.every((item) => valuations[item.tokenId])) return undefined;
  return items.reduce((sum, item) => {
    const valuation = valuations[item.tokenId] as BasketValuation;
    const income = valuation.holdings.find((holding) => holding.ticker === "USDG")?.value ?? BigInt(0);
    return sum + incomeEarned(income, apy, valuation.since, now);
  }, 0);
}

function ValueCells({ summary, income, loading }: { summary?: { value: bigint; costBasis: bigint }; income?: number; loading: React.ReactNode }) {
  return (
    <>
      <span className="mono" data-label="Invested">{summary ? usd(summary.costBasis) : loading}</span>
      <span className="mono" data-label="Worth now">{summary ? usd(summary.value) : loading}</span>
      <span className={`mono ${summary ? pnlTone(pnl(summary).direction) : ""}`} data-label="Profit / loss">
        {summary ? pnl(summary).label : loading}
      </span>
      <span className="mono positive" data-label="Income">{income === undefined ? loading : `+${smallUsd(income)}`}</span>
    </>
  );
}

/** A Basket's holdings, with the withdrawal panel opened on demand so the assets stay the first thing read. */
function PositionBody({ position, valuation, apy, now }: { position: WalletPosition; valuation: BasketValuation | null | undefined; apy?: number; now: number }) {
  const [withdrawing, setWithdrawing] = useState(false);
  return (
    <div className="position-body">
      <div className={withdrawing ? "position-body-grid" : undefined}>
        <AccountHoldings account={position.account} valuation={valuation} apy={apy} now={now} />
        {withdrawing ? <RedeemPanel position={position} valuation={valuation ?? undefined} /> : null}
      </div>
      <div className="position-actions">
        <button type="button" className="secondary-button" aria-expanded={withdrawing} onClick={() => setWithdrawing((open) => !open)}>
          {withdrawing ? "Hide withdrawal" : "Withdraw"}
        </button>
        <Link className="text-link" href={`/basket/${position.slug}`}>
          View {position.name} details <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const wallet = useWallet();
  const onchain = useValuations(wallet.positions, `${wallet.portfolioBlock ?? ""}`);
  const live = useLivePrices();
  const valuations: Record<string, BasketValuation | null> = {};
  for (const [tokenId, valuation] of Object.entries(onchain)) valuations[tokenId] = valuation ? atLivePrices(valuation, live) : valuation;
  const ready = wallet.positions.length > 0 && wallet.positions.every((position) => valuations[position.tokenId]);
  const totals = ready
    ? wallet.positions.reduce((sum, position) => {
        const valuation = valuations[position.tokenId] as BasketValuation;
        return { value: sum.value + valuation.value, costBasis: sum.costBasis + valuation.costBasis };
      }, { value: BigInt(0), costBasis: BigInt(0) })
    : undefined;
  const apy = useIncomeRate();
  const now = useNow();
  const incomeOf = (valuation: BasketValuation) => valuation.holdings.find((holding) => holding.ticker === "USDG")?.value ?? BigInt(0);
  const income = ready && apy
    ? wallet.positions.reduce((sum, position) => {
        const valuation = valuations[position.tokenId] as BasketValuation;
        return { earned: sum.earned + incomeEarned(incomeOf(valuation), apy, valuation.since, now), yearly: sum.yearly + incomePerYear(incomeOf(valuation), apy) };
      }, { earned: 0, yearly: 0 })
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
                <dd className={`mono ${totals ? pnlTone(pnl(totals).direction) : ""}`}>{totals ? pnl(totals).label : loading}</dd>
              </div>
              <div>
                <dt>Income earned</dt>
                <dd className="mono positive">{income ? `+${smallUsd(income.earned)}` : loading}</dd>
                {income && apy ? <small>{apy.toFixed(2)}% a year on your income portion · about {smallUsd(income.yearly)} a year</small> : null}
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
            <div className="positions">
              <div className="position-columns" aria-hidden="true">
                <span>Basket</span><span>Invested</span><span>Worth now</span><span>Profit / loss</span><span>Income</span>
              </div>
              {groupByTheme(wallet.positions).map((group) => {
                const summary = sumValuations(group.items, valuations);
                return (
                  <details className="position-group" key={group.slug} open={wallet.positions.length === 1}>
                    <summary className="position-row">
                      <span className="position-name">
                        <strong>{group.name}</strong>
                        <small>{group.items.length === 1 ? `Basket No. ${group.items[0].tokenId}` : `${group.items.length} Baskets`} · {group.theme}</small>
                      </span>
                      <ValueCells summary={summary} income={sumIncome(group.items, valuations, apy, now)} loading={loading} />
                      <span className="position-chevron" aria-hidden="true" />
                    </summary>
                    <div className="position-items">
                      {group.items.map((p) => group.items.length === 1 ? (
                        <PositionBody key={p.tokenId} position={p} valuation={valuations[p.tokenId]} apy={apy} now={now} />
                      ) : (
                        <details className="position-item" key={p.tokenId}>
                          <summary className="position-row position-subrow">
                            <span className="position-name"><strong>Basket No. {p.tokenId}</strong></span>
                            <ValueCells summary={sumValuations([p], valuations)} income={sumIncome([p], valuations, apy, now)} loading={loading} />
                            <span className="position-chevron" aria-hidden="true" />
                          </summary>
                          <PositionBody position={p} valuation={valuations[p.tokenId]} apy={apy} now={now} />
                        </details>
                      ))}
                    </div>
                  </details>
                );
              })}
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
