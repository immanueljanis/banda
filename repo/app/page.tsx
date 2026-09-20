import Link from "next/link";
import { BASKETS, money } from "@/lib/mock";
import { AssetLabel } from "@/components/asset-label";
import { BasketFeatures } from "@/components/asset-facts";
import { Certificate, Sparkline } from "@/components/certificate";
export default function Home() {
  return (
    <main id="main">
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="hero-kicker">DEFI, WITH FEWER STEPS</div>
          <h1>
            Your DeFi portfolio.
            <br className="desktop-break" /> <span>Simpler to manage.</span>
          </h1>
          <p>
            Choose a strategy. Explore its assets, costs and risks, then follow
            your portfolio in one place.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="#baskets">
              Browse baskets <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-link" href="#how-it-works">
              How it works <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </div>
        <div className="hero-object">
          <Certificate basket={BASKETS[0]} hero />
        </div>
      </section>
      <section className="tension">
        <div className="wrap tension-grid">
          <div>
            <h2>
              A diverse portfolio.
              <br />
              <span>Less to manage.</span>
            </h2>
          </div>
          <div className="comparison">
            <div className="comparison-head">
              <span>Without Banda</span>
              <span>
                With Banda <span aria-hidden="true">↗</span>
              </span>
            </div>
            {[
              ["Buy each asset separately", "Buy one basket"],
              ["Manage several positions", "See everything together"],
              ["Track balances across protocols", "Follow one portfolio"],
            ].map(([a, b], i) => (
              <div className="comparison-row" key={i}>
                <span>{a}</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="shelf wrap" id="baskets">
        <div className="section-heading">
          <div>
            <h2>Find your mix.</h2>
          </div>
        </div>
        <div className="basket-grid">
          {BASKETS.map((b, i) => (
            <article className={`shelf-card shelf-${b.slug}`} key={b.slug}>
              <div className="shelf-title">
                <h3>
                  <Link href={`/basket/${b.slug}`}>{b.name}</Link>
                </h3>
                <span className="shelf-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
              <p>{b.mandate}</p>
              <div className="shelf-data">
                <div>
                  <span className="eyebrow">EXAMPLE PORTFOLIO VALUE</span>
                  <strong className="mono">{money(b.nav)}</strong>
                </div>
                <div className="shelf-change">
                  <span className="eyebrow">
                    <span className="mono">30</span>D CHANGE
                  </span>
                  <span className="positive mono">+{b.change}%</span>
                </div>
                <Sparkline basket={b} />
              </div>
              <BasketFeatures basket={b} />
              <div className="ticker-row">
                {b.holdings.map((h) => (
                  <AssetLabel ticker={h.ticker} compact key={h.ticker} />
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="shelf-bottom">
          <span>All figures shown are examples, not historical returns.</span>
        </div>
      </section>
      <section className="simple-how wrap" id="how-it-works">
        <h2>A simpler way into DeFi.</h2>
        <div className="how-steps">
          <div>
            <span className="mono">01</span>
            <h3>Choose a strategy.</h3>
            <p>Compare each basket’s approach, assets, fees and risks.</p>
          </div>
          <div>
            <span className="mono">02</span>
            <h3>Choose your amount.</h3>
            <p>See how your chosen amount is allocated across the basket.</p>
          </div>
          <div>
            <span className="mono">03</span>
            <h3>See it in one place.</h3>
            <p>Explore your holdings and allocation in one portfolio view.</p>
          </div>
        </div>
        <Link className="text-link" href="/docs">
          Explore how Banda works →
        </Link>
      </section>
      <section className="fees wrap" id="fees">
        <div>
          <h2>Simple, transparent fees.</h2>
          <p>Management fees for the MVP.</p>
          <Link className="text-link" href="/docs">
            Read the methodology ↗
          </Link>
        </div>
        <div>
          <table className="fee-table">
            <caption className="sr-only">MVP fees</caption>
            <tbody>
              <tr>
                <th>Core (Beta Play)</th>
                <td>
                  <span className="mono">1%</span>
                  <span className="muted"> / year</span>
                </td>
              </tr>
              <tr>
                <th>Frontier (Alpha Play)</th>
                <td>
                  <span className="mono">2%</span>
                  <span className="muted"> / year</span>
                </td>
              </tr>
              <tr>
                <th>Performance</th>
                <td>None</td>
              </tr>
              <tr>
                <th>Buy</th>
                <td className="mono">0%</td>
              </tr>
              <tr>
                <th>Withdraw</th>
                <td className="mono">0%</td>
              </tr>
            </tbody>
          </table>
          <p className="fee-note">
            Management fees are designed to be reflected in NAV without a
            second charge on collection. Fee accrual is not implemented in
            this local demo; portfolio values remain illustrative.
          </p>
        </div>
      </section>
      <section className="closing wrap">
        <div>
          <span className="network-dot" />
          <h2>Explore DeFi. Find your strategy.</h2>
        </div>
        <Link className="primary-button" href="#baskets">
          Find your basket <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
