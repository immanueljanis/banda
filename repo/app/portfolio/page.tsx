"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet, type WalletPosition } from "@/components/wallet";
import { LiveChainStatus } from "@/components/live-chain-status";
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
              <span className="eyebrow">AVAILABLE TEST USDG</span>
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
                    <PositionRedeem position={p} />
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

function PositionRedeem({ position }: { position: WalletPosition }) {
  const wallet = useWallet();
  const [shares, setShares] = useState("");
  const [message, setMessage] = useState("");
  const entered = Number(shares);
  const available = Number(position.displayShares);
  const valid = Number.isFinite(entered) && entered > 0 && entered <= available;
  const full = valid && entered === available;
  const busy = wallet.transactionStatus === "signing" || wallet.transactionStatus === "confirming";

  return (
    <div className="redeem-panel">
      <label htmlFor={`redeem-${position.tokenId}`}>Redeem shares</label>
      <div className="redeem-controls">
        <input
          id={`redeem-${position.tokenId}`}
          className="redeem-input"
          inputMode="decimal"
          type="number"
          min="0.000001"
          max={position.displayShares}
          step="any"
          placeholder={position.displayShares}
          value={shares}
          onChange={(event) => { setShares(event.target.value); setMessage(""); }}
        />
        <button
          className="secondary-button"
          type="button"
          disabled={!valid || busy}
          onClick={async () => {
            try {
              const hash = await wallet.redeem(position.tokenId, shares);
              setMessage(`${full ? "Full" : "Partial"} redeem confirmed: ${hash.slice(0, 10)}…`);
              setShares("");
            } catch (reason) {
              setMessage(reason instanceof Error ? reason.message : "Redemption failed");
            }
          }}
        >
          {wallet.transactionStatus === "signing" ? "Confirm in wallet…" : wallet.transactionStatus === "confirming" ? "Confirming…" : full ? "Redeem all" : "Redeem"}
        </button>
      </div>
      <button className="text-button" type="button" onClick={() => { setShares(position.displayShares); setMessage(""); }}>
        Use all {position.displayShares} shares
      </button>
      <p className="muted">Estimated payout uses live NAV with 0.5% slippage protection.</p>
      {message ? <p className="transaction-message" role="status">{message}</p> : null}
    </div>
  );
}
