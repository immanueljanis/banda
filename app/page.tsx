import Link from "next/link";
import { BASKETS, money } from "@/constants/baskets";
import { AssetLabel, AssetLogo } from "@/components/asset-label";
import { Certificate, Sparkline } from "@/components/certificate";
import { Microtext, Rosette, Seal, WaveBand } from "@/components/guilloche";
import { yieldAssets, yieldWeight } from "@/lib/yields";

const SPECIMEN = BASKETS[0];

export default function Home() {
  return (
    <main id="main">
      <section className="hero-note">
        <Rosette className="hero-rosette" />
        <div className="wrap hero">
          <div className="hero-copy">
            <h1>Composable ETFs onchain. <span>One token, every asset inside.</span></h1>
            <p className="hero-lede">
              Banda turns a mix of stocks, crypto and gold into one token you
              own. Deposit USDG, a digital dollar, and your Basket’s own vault
              holds every asset inside. It is
              built to earn in two ways, so you are not relying on prices alone.
            </p>
            <dl className="hero-engines">
              <div>
                <dt><i className="category-0" aria-hidden="true" />Growth</dt>
                <dd>Stocks, crypto and gold in token form, chosen for the Basket’s theme.</dd>
              </div>
              <div>
                <dt><i className="category-2" aria-hidden="true" />Income</dt>
                <dd>10 to 25% sits in USDG and earns interest at the live USDG lending rate. Rates change and are not guaranteed.</dd>
              </div>
            </dl>
            <div className="hero-actions">
              <Link className="gold-button" href="#baskets">
                Browse Baskets <span aria-hidden="true">→</span>
              </Link>
              <Link className="text-link" href="#how-it-works">
                How it works
              </Link>
            </div>
          </div>
          <div className="hero-object">
            <Certificate basket={SPECIMEN} hero />
          </div>
        </div>
        <div className="wrap hero-terms">
          <span>5 live demo Baskets</span>
          <span>0.25% a year, nothing to buy or withdraw</span>
          <span>Your Basket, your vault</span>
          <span>Test version with test money</span>
        </div>
        <Microtext text="BANDA · COMPOSABLE ETFS ONCHAIN · ONE TOKEN, EVERY ASSET INSIDE" className="hero-microtext" />
      </section>

      <section className="anatomy wrap" aria-labelledby="anatomy-title">
        <div className="anatomy-copy">
          <h2 id="anatomy-title">What your Basket holds.</h2>
          <p>
            Every Basket is a token you own, with its own vault. The vault
            holds the investments, so the portfolio moves as one: send your
            Basket to someone and the whole mix goes with it.
          </p>
          <dl className="anatomy-sleeves">
            <div>
              <dt><i className="category-0" aria-hidden="true" />Growth</dt>
              <dd>Stocks, crypto and gold in token form, chosen for the Basket’s theme.</dd>
            </div>
            <div>
              <dt><i className="category-2" aria-hidden="true" />Income</dt>
              <dd>10 to 25% held in USDG that earns interest, so the Basket earns income as well as growing in price.</dd>
            </div>
            <div>
              <dt><i className="category-1" aria-hidden="true" />Liquidity</dt>
              <dd>Kept easy to sell, so the mix can be adjusted and you can withdraw at any time.</dd>
            </div>
          </dl>
        </div>
        <figure className="anatomy-diagram" aria-label={`How the ${SPECIMEN.name} Basket is held`}>
          <div className="anatomy-node anatomy-owner">
            <span className="anatomy-role">Your wallet owns</span>
            <strong>Your Basket No. {SPECIMEN.id}</strong>
            <span className="mono">ERC-721</span>
          </div>
          <div className="anatomy-node anatomy-account">
            <span className="anatomy-role">Which has</span>
            <strong>Its own vault</strong>
            <span className="mono">ERC-6551</span>
          </div>
          <ul className="anatomy-holdings">
            {SPECIMEN.holdings.map((holding) => (
              <li key={holding.ticker}>
                <AssetLabel ticker={holding.ticker} compact />
                <span className="mono">{holding.weight}%</span>
              </li>
            ))}
          </ul>
          <figcaption>
            Withdraw part of it and your Basket stays open. Withdraw everything
            and the Basket is closed.
          </figcaption>
        </figure>
      </section>

      <section className="ledger wrap" id="baskets" aria-labelledby="baskets-title">
        <div className="ledger-heading">
          <h2 id="baskets-title">Five demo Baskets, live now.</h2>
          <p>Values are examples based on real past prices. They are not a forecast.</p>
        </div>
        <ol className="ledger-list">
          {BASKETS.map((basket) => (
            <li className="ledger-row" key={basket.slug}>
              <div className="ledger-name">
                <span className="ledger-serial mono">No. {basket.id}</span>
                <h3>
                  <Link href={`/basket/${basket.slug}`}>{basket.name}</Link>
                </h3>
                <p>{basket.mandate}</p>
              </div>
              <div className="ledger-thesis">
                <strong>{basket.thesis}</strong>
                <span>{basket.character}</span>
                <span className="ledger-logos" aria-label={`Holdings: ${basket.holdings.map((h) => h.ticker).join(", ")}`}>
                  {basket.holdings.map((holding) => (
                    <AssetLogo ticker={holding.ticker} key={holding.ticker} />
                  ))}
                </span>
              </div>
              <div className="ledger-value">
                <span>Example $10,000 · 30 days</span>
                <strong className="mono">{money(basket.nav)}</strong>
                <span className={`mono ${basket.change >= 0 ? "positive" : "negative"}`}>
                  {basket.change >= 0 ? "+" : "−"}{Math.abs(basket.change).toFixed(2)}% · real prices
                </span>
              </div>
              <Sparkline basket={basket} />
              <div className="ledger-yield">
                <strong className="mono">{yieldWeight(basket)}%</strong>
                <span>income portion in {yieldAssets(basket).join(" + ")}</span>
              </div>
              <span className="ledger-arrow" aria-hidden="true">→</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="steps-section" id="how-it-works" aria-labelledby="steps-title">
        <div className="wrap">
          <h2 id="steps-title">From dollars to your own Basket in three steps.</h2>
          <ol className="steps">
            <li>
              <span className="step-number mono">1</span>
              <h3>Choose a theme</h3>
              <p>Compare each Basket’s theme, holdings, income portion, fee and risks.</p>
            </li>
            <li>
              <span className="step-number mono">2</span>
              <h3>Deposit USDG</h3>
              <p>Sign in with email, Google or your own wallet. Deposit USDG, a digital dollar, and your Basket is created for you.</p>
            </li>
            <li>
              <span className="step-number mono">3</span>
              <h3>Hold, send or withdraw</h3>
              <p>Track it in your portfolio. Withdraw any part of it back to USDG at any time.</p>
            </li>
          </ol>
          <Link className="text-link" href="/docs">
            Read how Banda works <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="terms wrap" id="fees" aria-labelledby="fees-title">
        <div className="terms-copy">
          <Seal className="terms-seal" label="NO ENTRY FEE · NO EXIT FEE" value="0%" />
          <h2 id="fees-title">
            <span>0% to buy.</span> <span>0% to withdraw.</span>
          </h2>
          <p>
            No fee to buy, no fee to withdraw and no performance fee. Just one
            yearly fee of 0.25%, charged in tiny amounts over time and taken
            only when you withdraw. You see it before you approve.
          </p>
          <Link className="text-link" href="/docs">
            Read the details <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="terms-sheet">
          <WaveBand className="terms-wave" />
          <table className="fee-table">
            <caption className="sr-only">Banda fees</caption>
            <tbody>
              <tr><th>Buy</th><td className="mono">0%</td></tr>
              <tr><th>Withdraw</th><td className="mono">0%</td></tr>
              <tr><th>Performance fee</th><td>None</td></tr>
              <tr><th>Yearly fee, every Basket</th><td><span className="mono">0.25%</span><span className="muted"> a year</span></td></tr>
            </tbody>
          </table>
          <p className="fee-note">
            The yearly fee is charged in tiny amounts over time, only when you
            withdraw. On this test version, holdings are practice versions of
            each asset, bought and sold at live market prices.
          </p>
        </div>
      </section>

      <section className="closing-note">
        <Rosette className="closing-rosette" />
        <div className="wrap closing">
          <h2>One token. Every asset inside.</h2>
          <Link className="gold-button" href="#baskets">
            Find your Basket <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
