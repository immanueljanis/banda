import Link from "next/link";
import { BASKETS, money } from "@/constants/baskets";
import { AssetLabel, AssetLogo } from "@/components/asset-label";
import { Certificate, Sparkline } from "@/components/certificate";
import { Microtext, Rosette, WaveBand } from "@/components/guilloche";
import { yieldAssets, yieldWeight } from "@/lib/yields";

const SPECIMEN = BASKETS[0];

export default function Home() {
  return (
    <main id="main">
      <section className="hero-note">
        <Rosette className="hero-rosette" />
        <div className="wrap hero">
          <div className="hero-copy">
            <p className="hero-network">
              <span className="network-dot" aria-hidden="true" /> Live on Robinhood Chain testnet
            </p>
            <h1>A managed portfolio you own as a single token.</h1>
            <p className="hero-lede">
              Pick a Basket of tokenized stocks, crypto, gold and DeFi yield.
              Deposit USDG and receive one NFT that holds the whole mix, with
              its mandate, fees and risks on record.
            </p>
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
          <span>5 thematic Baskets</span>
          <span>Deposits in USDG</span>
          <span>ERC-721 Basket, ERC-6551 account</span>
          <span>0% to buy or withdraw</span>
        </div>
        <Microtext text="BANDA · A MANAGED PORTFOLIO YOU OWN AS A SINGLE TOKEN" className="hero-microtext" />
      </section>

      <section className="anatomy wrap" aria-labelledby="anatomy-title">
        <div className="anatomy-copy">
          <h2 id="anatomy-title">What the token holds.</h2>
          <p>
            Every Basket is an NFT with its own onchain account. The account
            holds the positions, so the portfolio moves as one object: transfer
            the NFT and the whole mix goes with it.
          </p>
          <dl className="anatomy-sleeves">
            <div>
              <dt><i className="category-0" aria-hidden="true" />Growth</dt>
              <dd>Tokenized stocks and crypto chosen for the Basket’s thesis.</dd>
            </div>
            <div>
              <dt><i className="category-2" aria-hidden="true" />Yield</dt>
              <dd>A defined share placed in USDG DeFi positions.</dd>
            </div>
            <div>
              <dt><i className="category-1" aria-hidden="true" />Liquidity</dt>
              <dd>Discipline for rebalances and redemptions.</dd>
            </div>
          </dl>
        </div>
        <figure className="anatomy-diagram" aria-label={`How the ${SPECIMEN.name} Basket is held`}>
          <div className="anatomy-node anatomy-owner">
            <span className="anatomy-role">Your wallet owns</span>
            <strong>Basket NFT No. {SPECIMEN.id}</strong>
            <span className="mono">ERC-721</span>
          </div>
          <div className="anatomy-node anatomy-account">
            <span className="anatomy-role">Which controls</span>
            <strong>Basket account</strong>
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
            Redeem part of it and the NFT stays open. Redeem all of it and the
            NFT is burned.
          </figcaption>
        </figure>
      </section>

      <section className="ledger wrap" id="baskets" aria-labelledby="baskets-title">
        <div className="ledger-heading">
          <h2 id="baskets-title">Five mandates to choose from.</h2>
          <p>Values are illustrative examples, not historical returns.</p>
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
                <span>Example value</span>
                <strong className="mono">{money(basket.nav)}</strong>
                <span className="positive mono">+{basket.change}% · 30d</span>
              </div>
              <Sparkline basket={basket} />
              <div className="ledger-yield">
                <strong className="mono">{yieldWeight(basket)}%</strong>
                <span>yield sleeve via {yieldAssets(basket).join(" + ")}</span>
              </div>
              <span className="ledger-arrow" aria-hidden="true">→</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="steps-section" id="how-it-works" aria-labelledby="steps-title">
        <div className="wrap">
          <h2 id="steps-title">From USDG to one token in three steps.</h2>
          <ol className="steps">
            <li>
              <span className="step-number mono">1</span>
              <h3>Choose a mandate</h3>
              <p>Compare each Basket’s thesis, holdings, yield sleeve, fee and risks.</p>
            </li>
            <li>
              <span className="step-number mono">2</span>
              <h3>Deposit USDG</h3>
              <p>Sign in with Privy or your own wallet. The deposit mints your Basket NFT.</p>
            </li>
            <li>
              <span className="step-number mono">3</span>
              <h3>Hold, transfer or redeem</h3>
              <p>Track it in your portfolio. Redeem any share of it back to USDG at any time.</p>
            </li>
          </ol>
          <Link className="text-link" href="/docs">
            Read how Banda works <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="terms wrap" id="fees" aria-labelledby="fees-title">
        <div className="terms-copy">
          <h2 id="fees-title">The terms, printed plainly.</h2>
          <p>One annual management fee, reflected in the Basket’s value. Nothing charged to enter or leave.</p>
          <Link className="text-link" href="/docs">
            Read the methodology <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="terms-sheet">
          <WaveBand className="terms-wave" />
          <table className="fee-table">
            <caption className="sr-only">Banda fees</caption>
            <tbody>
              <tr><th>Diversified and defensive Baskets</th><td><span className="mono">1%</span><span className="muted"> a year</span></td></tr>
              <tr><th>Thematic and active Baskets</th><td><span className="mono">2%</span><span className="muted"> a year</span></td></tr>
              <tr><th>Performance fee</th><td>None</td></tr>
              <tr><th>Buy</th><td className="mono">0%</td></tr>
              <tr><th>Withdraw</th><td className="mono">0%</td></tr>
            </tbody>
          </table>
          <p className="fee-note">
            Fee accrual is not yet implemented on testnet. Values shown on this
            page are illustrative, and testnet payouts use a mock NAV.
          </p>
        </div>
      </section>

      <section className="closing-note">
        <Rosette className="closing-rosette" />
        <div className="wrap closing">
          <h2>One token. The whole portfolio.</h2>
          <Link className="gold-button" href="#baskets">
            Find your Basket <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
