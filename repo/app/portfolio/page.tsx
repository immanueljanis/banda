"use client";
import Link from "next/link";
import { useWallet } from "@/components/wallet";
import { BASKETS, money } from "@/constants/baskets";
export default function Portfolio() {
  const wallet = useWallet();
  return (
    <main className="portfolio wrap" id="main">
      <span className="section-index">YOUR ACCOUNT</span>
      <h1>Held together.</h1>
      {!wallet.connected ? (
        <p>
          Connect your wallet to explore your portfolio.{" "}
          <button className="wallet-button" onClick={wallet.connect}>
            Connect wallet
          </button>
        </p>
      ) : (
        <>
          <p>
            Total portfolio NAV{" "}
            <strong className="mono">
              {money(wallet.positions.reduce((n, p) => n + p.value, 0))}
            </strong>
          </p>
          {wallet.positions.length === 0 ? (
            <p>
              No baskets yet.{" "}
              <Link className="empty-link" href="/#baskets">
                Find your first basket →
              </Link>
            </p>
          ) : (
            <div className="portfolio-list">
              {wallet.positions.map((p) => (
                <article className="portfolio-item" key={p.id}>
                  <span className="eyebrow">PORTFOLIO CERTIFICATE</span>
                  <h2>{BASKETS.find((b) => b.slug === p.slug)?.name}</h2>
                  <p className="detail-nav mono">{money(p.value)}</p>
                  <p className="muted">Illustrative NAV. No real funds held.</p>
                  <button
                    className="primary-button"
                    onClick={() => wallet.redeem(p.id)}
                  >
                    Redeem basket ↗
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <p className="muted">
        This local demonstration resets on reload. Deposit and transfer require
        the future contract integration.
      </p>
    </main>
  );
}
