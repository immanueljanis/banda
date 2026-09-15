import Link from "next/link";
export default function Docs() {
  return (
    <main className="docs wrap" id="main">
      <Link className="breadcrumb" href="/">
        ← Back to Banda
      </Link>
      <span className="section-index">BANDA / PRODUCT NOTES</span>
      <h1>A portfolio with its own account.</h1>
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
        <h2>Proposed fees</h2>
        <p>
          Management is <span className="mono">1%</span> annually. Frontier also
          has a <span className="mono">10%</span> performance fee above its
          high-water mark. Mint and redeem fees are{" "}
          <span className="mono">0%</span> for the initial release. These are
          planning figures subject to the pre-launch decision.
        </p>
      </section>
      <section>
        <h2>About this demonstration</h2>
        <p>
          Portfolio values, yields and block numbers are examples. The wallet is
          a local simulation; no transaction is sent. Historical comparisons use
          daily market prices from June to September 2025 with hypothetical
          allocations. Open Methodology in the Historical tab for assumptions,
          excluded costs, price proxies and downloadable source data.
        </p>
      </section>
    </main>
  );
}
