"use client";
import Link from "next/link";
import { useWallet } from "@/components/wallet";
import { LiveChainStatus } from "@/components/live-chain-status";
import { RedeemPanel } from "@/components/redeem-panel";
export default function Portfolio() {
  const wallet = useWallet();
  return (
    <main className="portfolio wrap" id="main">
      <span className="section-index">YOUR ACCOUNT</span>
      <h1>Held together.</h1>
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
              <span className="eyebrow">LIVE TESTNET STATE</span>
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
                <article className="portfolio-item" key={p.tokenId}>
                  <span className="eyebrow">BASKET NFT #{p.tokenId}</span>
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
                    <RedeemPanel position={p} />
                    </>
                  ) : null}
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
    </main>
  );
}
