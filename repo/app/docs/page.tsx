import Link from "next/link";
export default function Docs() {
  return (
    <main className="docs wrap" id="main">
      <Link className="breadcrumb" href="/">
        ← Back to Banda
      </Link>
      <span className="section-index">BANDA / PRODUCT NOTES</span>
      <h1>Managed baskets, built to keep capital working.</h1>
      <p>
        Banda brings strategy selection, deposits, portfolio tracking and
        redemption into one planned flow. This demo lets you explore baskets and
        simulate deposits locally. Live deposits and redemption are not
        available yet. Easier access does not remove investment risk.
      </p>
      <section>
        <h2>What you own</h2>
        <p>
          A basket is an <span className="mono">ERC-721</span> NFT with its own{" "}
          <span className="mono">ERC-6551</span> account. The account holds{" "}
          <span className="mono">ERC-4626</span> strategy shares. Transferring
          basket ownership transfers the whole portfolio without selling each
          holding.
        </p>
      </section>
      <section>
        <h2>Login and wallet</h2>
        <p>
          Banda plans to use Privy so new users can sign in with familiar
          methods and use an embedded or smart wallet, while existing Web3 users
          can connect an external wallet. That user wallet owns the basket NFT.
          It is separate from the basket&apos;s restricted{" "}
          <span className="mono">ERC-6551</span> account, which holds the
          portfolio positions.
        </p>
      </section>
      <section>
        <h2>The initial collection</h2>
        <p>
          Core combines wrapped Bitcoin, Ether, tokenized gold, Aave USDC and
          Lido staked Ether. Frontier focuses on ARB, GMX and PENDLE with an
          Aave USDC buffer. Tokenized stocks, additional strategies, direct LP
          holdings and third-party lending are future capabilities.
        </p>
      </section>
      <section>
        <h2>Valuation and redemption</h2>
        <p>
          NAV is the sum of strategy shares multiplied by each vault’s asset
          conversion rate, plus direct holdings at eligible oracle prices,
          expressed in USDC. The product design computes NAV at the transaction
          block. Stale price feeds pause affected mint and redeem operations,
          while in-kind redemption returns the holdings directly.
        </p>
      </section>
      <section>
        <h2>Management and risks</h2>
        <p>
          Basket accounts are restricted: only the Manager can move holdings
          through defined actions. Basket ownership does not permit arbitrary
          account calls. The operator model remains a pre-launch decision. Smart
          contracts, oracles, underlying protocols and market liquidity
          introduce risks; diversification does not guarantee returns.
        </p>
      </section>
      <section>
        <h2>MVP fees</h2>
        <p>
          Annual management fees are <span className="mono">1%</span> for
          diversified and defensive mandates, and{" "}
          <span className="mono">2%</span> for thematic and active mandates.
          Basket character describes its strategy and is not a return guarantee.
          The MVP has no performance fee. Mint and redeem fees are{" "}
          <span className="mono">0%</span>.
        </p>
        <p>
          Management fees are designed to be reflected in NAV, with no second
          charge when collected. Accrual formulas, rounding and fee recipient
          authorization still need to be specified. Contract fee accrual and fee
          accounting in the NAV simulation are not implemented; demo values
          remain illustrative.
        </p>
      </section>
      <section>
        <h2>About this demonstration</h2>
        <p>
          Portfolio values, yields and block numbers are examples. The wallet is
          a local simulation; no transaction is sent. Privy is planned but not
          integrated in this demonstration. Historical comparisons use daily
          market prices from June to September 2025 with hypothetical
          allocations. Open Methodology in the Historical tab for assumptions,
          excluded costs, price proxies and downloadable source data.
        </p>
      </section>
    </main>
  );
}
