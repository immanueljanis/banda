"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "./wallet";
export function Mark() {
  return (
    <svg
      width="29"
      height="32"
      viewBox="0 0 29 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3h11c13 0 13 12 0 12H3V3Zm0 14h12c14 0 14 12 0 12H3V17Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M8 3v26M13 3v26" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
export function Header() {
  const wallet = useWallet();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const value = localStorage.getItem("banda-theme") === "dark";
    setDark(value);
    document.documentElement.dataset.theme = value ? "dark" : "light";
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("banda-theme", next ? "dark" : "light");
  }
  return (
    <header className="site-header">
      <div className="header wrap">
      <Link href="/" className="wordmark" aria-label="Banda home">
        <Mark />
        banda<span className="wordmark-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#baskets">Baskets</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/docs">
          Docs <span aria-hidden="true">↗</span>
        </Link>
      </nav>
      <div className="header-actions">
        <button
          className="theme-button"
          onClick={toggle}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {dark ? "☼" : "◐"}
        </button>
        {wallet.connected ? (
          <>
            <Link className="wallet-balance" href="/portfolio" aria-label={`${wallet.balanceLabel} test USDG available`}>
              <span className="wallet-balance-value">{wallet.portfolioStatus === "ready" ? wallet.balanceLabel : <span className="value-skeleton" aria-label="Loading balance" />}</span>
              <span className="wallet-balance-label">USDG</span>
            </Link>
            <Link className="wallet-button" href="/portfolio">
              Portfolio ↗
            </Link>
            <button className="disconnect" onClick={wallet.disconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <button className="wallet-button" onClick={wallet.connect} disabled={!wallet.ready || wallet.connecting}>
            {wallet.connecting ? "Opening login…" : "Connect wallet"} <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer wrap">
      <div>
        <Link href="/" className="wordmark">
          <Mark />
          banda.
        </Link>
        <p>A managed portfolio you own as a single token.</p>
      </div>
      <div className="footer-links">
        <Link href="/#baskets">Explore Baskets ↗</Link>
        <Link href="/docs">Documentation ↗</Link>
        <Link href="/#fees">Fees ↗</Link>
      </div>
      <div className="footer-note">
        This is a test version of Banda with test money. Nothing here has real value.
        <p>
          It runs on the Robinhood Chain test network. Holdings are practice
          versions of real assets, bought and sold at live market prices. Past
          comparisons are hypothetical examples based on real prices.
        </p>
        <span className="mono">© 2026 Banda</span>
      </div>
    </footer>
  );
}
