import Link from "next/link";
import { BASKETS, money } from "@/constants/baskets";
import { AssetLabel } from "@/components/asset-label";
import { BasketFeatures } from "@/components/asset-facts";
import { Certificate, Sparkline } from "@/components/certificate";
import { yieldAssets, yieldWeight } from "@/lib/yields";
export default function Home() {
  return (
    <main id="main">
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="hero-kicker">MANAGED DEFI BASKETS</div>
          <h1>
            Growth in one basket.
            <br className="desktop-break" /> <span>Yield at work in DeFi.</span>
          </h1>
          <p>
            Own a managed mix of growth assets and productive DeFi positions.
            The mandate, yield sources and risks stay visible.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="#baskets">
              Browse baskets <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-link" href="#mandate">
              See the mandate <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </div>
        <div className="hero-object">
          <Certificate basket={BASKETS[0]} hero />
        </div>
      </section>
      <section className="tension" id="mandate">
        <div className="wrap tension-grid">
          <div>
            <h2>
              Built for growth.
              <br />
              <span>Kept productive in DeFi.</span>
            </h2>
          </div>
          <div>
            <p className="mandate-intro">
              Each Banda basket has a published job: pursue its growth mandate,
              put a defined portion to work through DeFi, and retain liquidity
              discipline for portfolio operations.
            </p>
            <div className="mandate-map">
              {[
                [
                  "01",
                  "Growth sleeve",
                  "Assets selected for long-term appreciation.",
                ],
                [
                  "02",
                  "Yield sleeve",
                  "Defined DeFi positions designed to keep part of the basket productive.",
                ],
                [
                  "03",
                  "Liquidity discipline",
                  "A mandate for rebalances and future redemption needs.",
                ],
              ].map(([number, title, copy]) => (
                <div className="mandate-row" key={number}>
                  <span className="mono">{number}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="shelf wrap" id="baskets">
        <div className="section-heading">
          <div>
            <h2>Choose a managed mandate.</h2>
          </div>
        </div>
        <div className="basket-grid">
          {BASKETS.map((b) => (
            <article className={`shelf-card shelf-${b.slug}`} key={b.slug}>
              <div className="shelf-card-top">
                <span>{b.thesis}</span>
                <span className="mono">{b.character}</span>
              </div>
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
              <div className="sleeve-summary">
                <span className="eyebrow">YIELD SLEEVE</span>
                <strong className="mono">{yieldWeight(b)}%</strong>
                <p>
                  DeFi yield exposure through {yieldAssets(b).join(" + ")}.
                  Variable, illustrative and before Banda fees.
                </p>
              </div>
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
        <h2>One basket, visible work.</h2>
        <div className="how-steps">
          <div>
            <span className="mono">01</span>
            <h3>Choose a mandate.</h3>
            <p>Compare its growth approach, yield sleeve, fees and risks.</p>
          </div>
          <div>
            <span className="mono">02</span>
            <h3>Fund one basket.</h3>
            <p>Own the full mix through a single basket position.</p>
          </div>
          <div>
            <span className="mono">03</span>
            <h3>Follow the mandate.</h3>
            <p>
              See holdings, allocation and yield sources in one portfolio view.
            </p>
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
                <th>Diversified and defensive</th>
                <td>
                  <span className="mono">1%</span>
                  <span className="muted"> / year</span>
                </td>
              </tr>
              <tr>
                <th>Thematic and active</th>
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
            Management fees are designed to be reflected in NAV without a second
            charge on collection. Fee accrual is not implemented in this local
            demo; portfolio values remain illustrative.
          </p>
        </div>
      </section>
      <section className="closing wrap">
        <div>
          <span className="network-dot" />
          <h2>One mandate. Many assets at work.</h2>
        </div>
        <Link className="primary-button" href="#baskets">
          Find your basket <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
