"use client";
import Link from "next/link";
import { useWallet } from "@/components/wallet";
import { LiveChainStatus } from "@/components/live-chain-status";
import { RedeemPanel } from "@/components/redeem-panel";
import { AccountHoldings } from "@/components/account-holdings";
import { Rosette, WaveBand } from "@/components/guilloche";
export default function Portfolio() {
  const wallet = useWallet();
  return (
    <main id="main">
      <section className="detail-note">
        <Rosette className="hero-rosette" />
        <div className="wrap detail-hero">
          <h1>Your Baskets.</h1>
          <p>Every Basket NFT this wallet owns, read live from Robinhood Chain testnet.</p>
        </div>
      </section>
      <div className="portfolio wrap">
      {!wallet.connected ? (
        <p>
          Connect your wallet to explore your portfolio.{" "}
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
            Reading your Robinhood testnet portfolio.
          </span>
        </div>
      ) : wallet.portfolioStatus === "error" ? (
        <div className="portfolio-notice" role="alert">
          <p>We could not read this wallet from Robinhood testnet.</p>
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
                  Indexed through block{" "}
                  <span className="mono">
                    {Number(wallet.portfolioBlock).toLocaleString("en-US")}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          {wallet.positions.length === 0 ? (
            <div className="portfolio-empty">
              <h2>No active Baskets.</h2>
              <p>
                This wallet currently owns no Banda Basket NFTs. Fully redeemed
                Baskets are burned and do not appear here.
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
                    <span className="mono">{p.displayShares}</span> strategy
                    shares
                  </p>
                  <p className="muted">
                    ERC-6551 account <span className="mono">{p.account}</span>
                  </p>
                  {p.slug !== "unknown" ? (
                    <>
                    <Link className="primary-button" href={`/basket/${p.slug}`}>
                      View Basket ↗
                    </Link>
                    <AccountHoldings account={p.account} strategyId={p.strategyId} refreshKey={`${p.shares}-${wallet.portfolioBlock ?? ""}`} />
                    <RedeemPanel position={p} />
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
        Balance and ownership are read from Robinhood Chain testnet. Test USDG
        and fixture strategy shares have no mainnet value. Banda never receives
        your private key.
      </p>
      <LiveChainStatus />
      </div>
    </main>
  );
}
