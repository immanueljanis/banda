"use client";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { ASSETS, BASKETS } from "@/constants/baskets";
import { AssetLogo } from "./asset-label";
import { Certificate } from "./certificate";
import { Microtext, Rosette } from "./guilloche";
import { Mark } from "./shell";

const FRONTIER = BASKETS.find((basket) => basket.slug === "frontier") ?? BASKETS[0];

type Slide = { label: string; note?: boolean; render: () => ReactNode };

const SLIDES: Slide[] = [
  {
    label: "Arbitrum Open House · Robinhood Chain",
    note: true,
    render: () => (
      <div className="pitch-title">
        <span className="pitch-mark"><Mark /></span>
        <h1>banda<span>.</span></h1>
        <p>Composable ETFs onchain. <b>One token, every asset inside.</b></p>
        <span className="pitch-pill">Live on Robinhood Chain testnet</span>
      </div>
    ),
  },
  {
    label: "The thesis",
    render: () => (
      <div className="pitch-quote">
        <blockquote>
          <p>“Tokenization will take over the entire financial system.”</p>
          <footer className="pitch-cite">
            <img src="/pitch/vlad-tenev.jpg" width={64} height={64} alt="Vlad Tenev" />
            <span>
              <b>Vlad Tenev</b>
              <span>CEO of Robinhood · CNBC, August 2026</span>
              <small>Photo: Pierce Larick, CC BY-SA 4.0, via Wikimedia Commons</small>
            </span>
          </footer>
        </blockquote>
        <dl className="pitch-facts">
          <div><dt className="mono">190+</dt><dd>stock tokens issued by Robinhood</dd></div>
          <div><dt className="mono">24/7</dt><dd>trading, settled onchain</dd></div>
          <div><dt className="mono">L2</dt><dd>Robinhood Chain, an L2 built for real-world assets</dd></div>
        </dl>
      </div>
    ),
  },
  {
    label: "Where it goes next",
    render: () => (
      <div className="pitch-col">
        <h2>Stocks became tokens. <em>Next, they become programmable.</em></h2>
        <ol className="pitch-ladder">
          {[
            ["Stocks", "done"],
            ["Tokens", "done"],
            ["Programmable assets", "now"],
            ["DeFi collateral", "next"],
            ["Global financial infrastructure", "next"],
          ].map(([step, state]) => (
            <li key={step} data-state={state}>
              <span className="pitch-ladder-dot" aria-hidden="true" />
              <strong>{step}</strong>
              {state === "now" && <span className="pitch-ladder-tag">Banda builds here</span>}
            </li>
          ))}
        </ol>
        <p className="pitch-note">
          Robinhood’s “tokenization supercycle” thesis, 2026. Banda takes the step after
          the token: a whole portfolio as one programmable asset.
        </p>
      </div>
    ),
  },
  {
    label: "The setup",
    render: () => (
      <div className="pitch-split">
        <div>
          <h2>Every asset is a token now.</h2>
          <span className="eyebrow pitch-sub">On Robinhood Chain today</span>
          <ul className="pitch-assets">
            {["QQQ", "TSLA", "AMD", "GLD", "SOL", "USDG"].map((ticker) => (
              <li key={ticker}><AssetLogo ticker={ticker} />{ASSETS[ticker].name}</li>
            ))}
          </ul>
        </div>
        <table className="pitch-can">
          <thead><tr><th>A wallet can</th><th>Today</th></tr></thead>
          <tbody>
            {[
              ["Buy one stock token", true],
              ["Trade it around the clock", true],
              ["Send it to anyone", true],
              ["Own a diversified portfolio in one step", false],
              ["Move a whole portfolio as one", false],
              ["Check every asset an index holds", false],
            ].map(([can, yes]) => (
              <tr key={String(can)}>
                <td>{can}</td>
                <td className={yes ? "pitch-yes" : "pitch-no"}>
                  {yes ? "✓" : "✕"}<span className="sr-only">{yes ? "Yes" : "No"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    label: "The problem",
    render: () => (
      <div className="pitch-col">
        <h2>A portfolio still means <em>eight separate trades.</em></h2>
        <ol className="pitch-trades">
          {FRONTIER.holdings.map((holding, i) => (
            <li key={holding.ticker}>
              <span className="mono">Trade {i + 1} of 8</span>
              <AssetLogo ticker={holding.ticker} />
              <strong>{holding.ticker}</strong>
              <span className="mono">{holding.weight}%</span>
            </li>
          ))}
        </ol>
        <p className="pitch-note">
          Eight swaps, eight position sizes, eight balances to track. Index tokens avoid
          that by pooling everyone’s deposits into one shared fund, so you own a share of
          the pool, not the assets.
        </p>
      </div>
    ),
  },
  {
    label: "Meet Banda",
    note: true,
    render: () => (
      <div className="pitch-split pitch-meet">
        <div>
          <h2>Meet Banda.</h2>
          <p className="pitch-lede">
            A platform for composable ETFs on Robinhood Chain. One USDG deposit buys
            every asset in a Basket at live market prices.
          </p>
          <ul className="pitch-terms">
            <li>Up to 8 assets in one transaction</li>
            <li>Your Basket, your vault</li>
            <li>0% to buy or withdraw, 0.25% a year</li>
          </ul>
        </div>
        <div className="pitch-certificate"><Certificate basket={FRONTIER} hero /></div>
      </div>
    ),
  },
  {
    label: "How a Basket is held",
    render: () => (
      <div className="pitch-split">
        <div>
          <h2>The portfolio <em>is</em> the token.</h2>
          <p className="pitch-lede">
            Every Basket is an ERC-721 token with its own ERC-6551 vault. The vault holds
            the actual assets, and only your token controls it.
          </p>
          <p className="pitch-lede">
            Send the token and the whole portfolio moves with it, without selling
            anything. Because it is a standard token, other protocols can hold it too.
          </p>
        </div>
        <figure className="anatomy-diagram pitch-anatomy" aria-label={`How the ${FRONTIER.name} Basket is held`}>
          <div className="anatomy-node anatomy-owner">
            <span className="anatomy-role">Your wallet owns</span>
            <strong>Basket No. {FRONTIER.id}</strong>
            <span className="mono">ERC-721</span>
          </div>
          <div className="anatomy-node anatomy-account">
            <span className="anatomy-role">Which has</span>
            <strong>Its own vault</strong>
            <span className="mono">ERC-6551</span>
          </div>
          <ul className="anatomy-holdings">
            {FRONTIER.holdings.map((holding) => (
              <li key={holding.ticker}>
                <span className="pitch-holding"><AssetLogo ticker={holding.ticker} />{holding.ticker}</span>
                <span className="mono">{holding.weight}%</span>
              </li>
            ))}
          </ul>
        </figure>
      </div>
    ),
  },
  {
    label: "One transaction",
    render: () => (
      <div className="pitch-col">
        <h2>Eight assets. <em>One transaction.</em></h2>
        <ol className="pitch-flow">
          <li><span className="mono">1</span><strong>Deposit USDG</strong><p>Email, Google or your own wallet.</p></li>
          <li><span className="mono">2</span><strong>Price every leg</strong><p>Chainlink on Robinhood Chain, plus CoinGecko.</p></li>
          <li><span className="mono">3</span><strong>Buy all eight</strong><p>At live market prices, atomically.</p></li>
          <li><span className="mono">4</span><strong>Into your vault</strong><p>Every holding lands in the Basket’s own vault.</p></li>
        </ol>
        <dl className="pitch-guards">
          <div><dt>Stale prices</dt><dd>Refused when older than 15 minutes</dd></div>
          <div><dt>Price jumps</dt><dd>Capped at 20% per update</dd></div>
          <div><dt>Leaving</dt><dd>Withdraw 1% to 100%, even while deposits are paused</dd></div>
          <div><dt>Fees</dt><dd>0% in, 0% out, 0.25% a year, shown before you approve</dd></div>
        </dl>
      </div>
    ),
  },
  {
    label: "What makes it different",
    render: () => (
      <div className="pitch-col">
        <h2>Your own vault, <em>not a shared pool.</em></h2>
        <table className="pitch-compare">
          <thead><tr><th><span className="sr-only">Question</span></th><th>Index token</th><th>Banda Basket</th></tr></thead>
          <tbody>
            {[
              ["What you hold", "A share of one pooled fund", "A token with its own vault of assets"],
              ["Who else is inside", "Every other depositor", "Nobody. One owner per vault"],
              ["What you can check", "Fund-level totals", "Every balance in your Basket, onchain"],
              ["Sending it", "Moves a fund share", "Moves the whole portfolio, nothing sold"],
              ["Leaving", "Redeem or sell the share", "Your exact share of every asset, in USDG"],
            ].map(([row, pool, banda]) => (
              <tr key={row}><th>{row}</th><td>{pool}</td><td>{banda}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    label: "Why Robinhood Chain",
    render: () => (
      <div className="pitch-col">
        <h2>Built for <em>Robinhood Chain.</em></h2>
        <p className="pitch-lede">Every piece a Basket needs already lives on this chain.</p>
        <dl className="pitch-reasons">
          <div><dt>Stock tokens next to crypto</dt><dd>QQQ, TSLA and gold sit beside SOL and RENDER, so one Basket can hold all of them.</dd></div>
          <div><dt>Chainlink feeds for stocks</dt><dd>Every leg is priced from Chainlink on Robinhood Chain mainnet.</dd></div>
          <div><dt>Paxos USDG settlement</dt><dd>Deposits and withdrawals settle in Paxos’ official USDG.</dd></div>
          <div><dt>Arbitrum Orbit costs</dt><dd>An eight-leg buy fits in one cheap transaction.</dd></div>
        </dl>
      </div>
    ),
  },
  {
    label: "Traction",
    render: () => (
      <div className="pitch-col">
        <div className="pitch-demo-head">
          <h2>Live on testnet <em>today.</em></h2>
          <span className="mono pitch-demo-url">bandafinance.xyz · Robinhood Chain testnet</span>
        </div>
        <ol className="pitch-ledger">
          {BASKETS.map((basket) => (
            <li key={basket.slug}>
              <span className="mono pitch-serial">No. {basket.id}</span>
              <strong>{basket.name}</strong>
              <span className="pitch-thesis">{basket.thesis}</span>
              <span className="ledger-logos">
                {basket.holdings.map((holding) => <AssetLogo ticker={holding.ticker} key={holding.ticker} />)}
              </span>
              <Link className="pitch-open" href={`/basket/${basket.slug}`} aria-label={`Open the ${basket.name} Basket`}>
                Open <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ol>
        <ul className="pitch-proof">
          <li>192 automated tests</li>
          <li>Every contract verified on Sourcify</li>
          <li>Settled in Paxos USDG</li>
          <li>Practice tokens at live prices</li>
        </ul>
      </div>
    ),
  },
  {
    label: "The ask",
    note: true,
    render: () => (
      <div className="pitch-split pitch-ask">
        <div>
          <h2>One token. <em>Every asset inside.</em></h2>
          <p className="pitch-lede">
            We are asking for an Open House grant to take Banda to Robinhood Chain mainnet.
          </p>
          <Link className="gold-button" href="/">
            Try it on testnet <span aria-hidden="true">→</span>
          </Link>
          <p className="pitch-url mono">bandafinance.xyz · github.com/immanueljanis/banda</p>
        </div>
        <ol className="pitch-roadmap">
          <li><span className="mono">M1</span><p>Issuer-bridged real assets and the USDG income portion</p></li>
          <li><span className="mono">M2</span><p>Security audit and a multisig admin</p></li>
          <li><span className="mono">M3</span><p>Limited mainnet launch with open Basket creation</p></li>
        </ol>
      </div>
    ),
  },
];

/** Keyboard-driven slide deck at /pitch; the slide number lives in the URL hash so a reload or a back navigation returns to the same slide. */
export function PitchDeck() {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const last = SLIDES.length - 1;
  const go = (next: number) => setIndex(Math.max(0, Math.min(last, next)));

  useEffect(() => {
    const fromHash = Number(window.location.hash.slice(1));
    if (fromHash >= 1 && fromHash <= SLIDES.length) setIndex(fromHash - 1);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.history.replaceState(null, "", `#${index + 1}`);
  }, [index, loaded]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === " " && target?.closest("a, button")) return;
      const step: Record<string, (n: number) => number> = {
        ArrowRight: (n) => n + 1,
        PageDown: (n) => n + 1,
        " ": (n) => n + 1,
        ArrowLeft: (n) => n - 1,
        PageUp: (n) => n - 1,
        Home: () => 0,
        End: () => last,
      };
      if (!step[event.key]) return;
      event.preventDefault();
      setIndex((n) => Math.max(0, Math.min(last, step[event.key](n))));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  const slide = SLIDES[index];
  return (
    <main id="main" className="pitch">
      <section
        key={index}
        className={`pitch-slide ${slide.note ? "hero-note" : ""}`}
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${SLIDES.length}: ${slide.label}`}
      >
        {slide.note && <Rosette className="hero-rosette pitch-rosette" />}
        <div className="pitch-top">
          <span className="eyebrow">{slide.label}</span>
          <span className="mono">{index + 1} / {SLIDES.length}</span>
        </div>
        <div className="pitch-stage">{slide.render()}</div>
        {slide.note && <Microtext text="BANDA · COMPOSABLE ETFS ONCHAIN · ONE TOKEN, EVERY ASSET INSIDE" className="hero-microtext pitch-microtext" />}
      </section>
      <nav className="pitch-nav" aria-label="Slides">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">←</button>
        <ol>
          {SLIDES.map((item, i) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}: ${item.label}`}
                aria-current={i === index ? "step" : undefined}
              />
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => go(index + 1)} disabled={index === last} aria-label="Next slide">→</button>
      </nav>
    </main>
  );
}
