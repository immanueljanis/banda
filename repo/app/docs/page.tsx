import Link from "next/link";
import { Rosette } from "@/components/guilloche";

export default function Docs() {
  return (
    <main id="main">
      <section className="detail-note">
        <Rosette className="hero-rosette" />
        <div className="wrap detail-hero">
          <Link className="breadcrumb" href="/">
            ← Back to Banda
          </Link>
          <h1>How Banda works.</h1>
          <p>
            A managed portfolio you own as a single token. This is a test
            version of Banda with test money. Nothing here has real value.
            Simple access does not remove investment risk.
          </p>
        </div>
      </section>
      <div className="docs wrap">
        <section>
          <h2>What you own</h2>
          <p>
            A Basket is a token you own. It has its own vault, and the vault
            holds every investment in the portfolio: stocks, crypto, gold and an
            income portion in USDG, a digital dollar. Send your Basket to
            someone and the whole portfolio goes with it, without selling
            anything. On this test version, each holding is a clearly labelled
            practice version of the real asset, bought and sold at live market
            prices.
          </p>
        </section>
        <section>
          <h2>Signing in</h2>
          <p>
            Sign in with your email, Google or a wallet you already use. That
            wallet owns your Basket. The Basket’s vault is separate from your
            wallet and only allows a short list of actions on the holdings.
          </p>
        </section>
        <section>
          <h2>The five Baskets</h2>
          <p>
            NEURAL follows artificial intelligence, RAILS digital finance,
            RESERVE a balanced core, FRONTIER future technology and FORTRESS
            hard assets with income. Each mixes stocks, crypto or gold with an
            income portion in USDG.
          </p>
        </section>
        <section>
          <h2>Buying and withdrawing</h2>
          <p>
            Buying takes two approvals in your wallet: first you let Banda use
            your USDG, then you make the deposit and get your Basket. You can
            withdraw any part of a Basket back to USDG at any time. Withdraw
            part and your Basket stays open. Withdraw everything and it closes.
            If deposits are ever paused, you can still withdraw.
          </p>
        </section>
        <section>
          <h2>Prices</h2>
          <p>
            Holdings are bought and sold at live market prices. Just before
            your transaction, Banda checks that every price is recent. If a
            price is too old, nothing happens and nothing is spent. When you
            withdraw, you see the amount first. You get at least{" "}
            <span className="mono">99.5%</span> of that amount, or nothing
            happens.
          </p>
        </section>
        <section>
          <h2>Management and risks</h2>
          <p>
            The manager can only make a short list of changes to a Basket,
            within published limits. On this test version, admin control is not
            yet shared between several people or delayed by a waiting period.
            Prices can fall, and you may get back less than you put in. Software
            bugs, price data, the services a Basket relies on and market
            conditions all add risk. Spreading your money across assets does not
            guarantee returns.
          </p>
        </section>
        <section>
          <h2>Fees</h2>
          <p>
            Every Basket has one yearly fee of{" "}
            <span className="mono">0.25%</span>, fixed for the life of the
            Basket. There is no performance fee, and buying or withdrawing costs{" "}
            <span className="mono">0%</span>. The yearly fee is charged in tiny
            amounts over time and taken only when you withdraw, so you always
            see it before you approve.
          </p>
        </section>
        <section>
          <h2>About the figures</h2>
          <p>
            Test USDG has no value. Basket values on the home and Basket pages
            are examples. Past comparisons use real daily prices from June to
            September 2025 with a hypothetical mix; open Methodology in a
            Basket’s Historical tab for the assumptions and sources. The income
            portion earns nothing on this test version. On the real version it
            is designed to earn interest, at rates that change.
          </p>
        </section>
        <section>
          <h2>For developers</h2>
          <p>
            Each Basket is an <span className="mono">ERC-721</span> token with
            its own <span className="mono">ERC-6551</span> token-bound account,
            and that account holds every position onchain. Deposits and
            redemptions go through a Diamond (<span className="mono">EIP-2535</span>)
            contract; a partial redemption keeps the NFT and a full redemption
            burns it. On testnet, each holding is a clearly labelled mock token
            standing in for the issuer-bridged asset a mainnet gateway would
            use, and the testnet pool is the counterparty.
          </p>
          <p>
            Prices come from Chainlink on Robinhood Chain mainnet for stocks,
            ETFs, ETH, BTC and LINK (normalized through USDG/USD), and from
            CoinGecko for SOL, TAO, NEAR and RENDER. Just before a transaction,
            Banda republishes any price older than half its 15-minute limit and
            refreshes the Basket’s NAV guard; the contracts reject stale prices
            and NAV. Redemptions pass <span className="mono">minAssetsOut</span>{" "}
            at 99.5% of the previewed payout. The 0.25% management fee is fixed
            onchain, accrues per second on the deposited amount and is
            collected on redemption. Pausing stops deposits and rebalances,
            never redemptions. Testnet admin authority is not yet behind a
            multisig or timelock.
          </p>
        </section>
      </div>
    </main>
  );
}
