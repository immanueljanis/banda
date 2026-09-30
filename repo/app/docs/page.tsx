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
            A managed portfolio you own as a single token, running on Robinhood
            Chain testnet. Easier access does not remove investment risk.
          </p>
        </div>
      </section>
      <div className="docs wrap">
        <section>
          <h2>What you own</h2>
          <p>
            A Basket is an <span className="mono">ERC-721</span> NFT with its
            own <span className="mono">ERC-6551</span> account, and that account
            holds every position as a token you can inspect onchain: stocks,
            crypto, gold and the USDG yield sleeve. Transferring the NFT
            transfers the whole portfolio without selling each holding. On
            testnet, each holding is a clearly labelled mock token standing in
            for the issuer-bridged asset a mainnet gateway would use, and it is
            bought and sold at live market prices.
          </p>
        </section>
        <section>
          <h2>Signing in</h2>
          <p>
            Sign in with Privy to use an embedded wallet, or connect a wallet
            you already use. That wallet owns the Basket NFT. It is separate
            from the Basket’s restricted account, which holds the positions.
          </p>
        </section>
        <section>
          <h2>The five Baskets</h2>
          <p>
            NEURAL follows artificial intelligence, RAILS the onchain financial
            economy, RESERVE a diversified core, FRONTIER future technology and
            FORTRESS hard assets with income. Each combines tokenized stocks,
            crypto or gold with a USDG DeFi yield sleeve.
          </p>
        </section>
        <section>
          <h2>Buying and redeeming</h2>
          <p>
            A deposit takes two wallet confirmations: approve USDG, then deposit
            into the Basket, which mints your NFT. You can redeem any share of a
            Basket back to USDG. A partial redemption keeps the NFT open; a full
            redemption burns it. Pausing the protocol stops deposits and
            rebalances, never redemptions.
          </p>
        </section>
        <section>
          <h2>Valuation on testnet</h2>
          <p>
            Holdings are bought and redeemed at live market prices: Chainlink on
            Robinhood Chain mainnet for stocks, ETFs, ETH, BTC and LINK
            (normalized through USDG/USD), and CoinGecko for SOL, TAO, NEAR and
            RENDER. Just before your transaction, Banda republishes any price
            older than half its 15-minute limit and refreshes the Basket’s NAV
            guard; the contracts reject stale prices and quotes. The testnet pool
            is the counterparty, and the management fee accrues on the amount you
            deposited.
          </p>
        </section>
        <section>
          <h2>Management and risks</h2>
          <p>
            Basket accounts are restricted: only defined management actions can
            move holdings, within published bounds. Testnet admin authority is
            not yet behind a multisig or timelock. Smart contracts, oracles,
            underlying protocols and market liquidity all introduce risk, and
            diversification does not guarantee returns.
          </p>
        </section>
        <section>
          <h2>Fees</h2>
          <p>
            Every Basket has one annual management fee of{" "}
            <span className="mono">0.25%</span>, fixed onchain for the life of
            the Basket and reflected in the Basket’s value. There is no performance fee, and
            buying or withdrawing costs <span className="mono">0%</span>. The
            management fee accrues onchain by the second and is collected only
            when you redeem, so the redemption preview always shows it first.
          </p>
        </section>
        <section>
          <h2>About the figures</h2>
          <p>
            Test USDG has no value. Basket values on the landing and Basket pages
            are illustrative. Historical comparisons use daily market prices
            from June to September 2025 with hypothetical allocations; open
            Methodology in a Basket’s Historical tab for assumptions and sources.
          </p>
        </section>
      </div>
    </main>
  );
}
