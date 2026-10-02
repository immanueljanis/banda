import { ASSET_FACTS, type Basket } from "@/constants/baskets";
import {
  yieldFor,
  basketYield,
  yieldDate,
  yieldSnapshotDate,
} from "@/lib/yields";

export function AssetFacts({ ticker }: { ticker: string }) {
  const facts = ASSET_FACTS[ticker];
  const estimate = yieldFor(ticker);
  if (!facts?.yield) return null;
  return (
    <div className="asset-facts">
      {estimate && (
        <div className="asset-apy">
          <span>Est. yearly rate</span>
          <strong className="mono">{estimate.apy.toFixed(2)}%</strong>
        </div>
      )}
      {(["yield"] as const).map((kind) => {
        const fact = facts[kind];
        return (
          fact && (
            <details className={`asset-fact fact-${kind}`} key={kind}>
              <summary>{fact.label}</summary>
              <p>{fact.detail}</p>
              {estimate && (
                <>
                  <p>
                    {estimate.provider}. {estimate.method}
                  </p>
                  <p>
                    Rate as of {yieldDate(estimate.asOf)}. It changes, and is
                    before Banda’s fee. On this test version it earns nothing yet.
                  </p>
                  <a href={estimate.source} target="_blank" rel="noreferrer">
                    Rate source ↗
                  </a>
                  {" · "}
                </>
              )}
              <a href={fact.source} target="_blank" rel="noreferrer">
                Provider details ↗
              </a>
            </details>
          )
        );
      })}
    </div>
  );
}

export function BasketFeatures({ basket }: { basket: Basket }) {
  const yielding = basket.holdings.filter((h) => ASSET_FACTS[h.ticker]?.yield);
  return (
    <div className="basket-features">
      {yielding.length > 0 && (
        <details className="basket-feature">
          <summary>
            <span className="feature-dot" />{" "}
            {Array.from(
              new Set(
                yielding.map((h) =>
                  ASSET_FACTS[h.ticker].yield!.label.replace(" yield", ""),
                ),
              ),
            ).join(" + ")}{" "}
            <strong className="basket-apy mono">
              {basketYield(basket).toFixed(2)}% <span>est. yearly rate</span>
            </strong>
          </summary>
          <p>
            {yielding.map((h) => `${h.ticker} (${h.weight}%)`).join(" · ")} of
            the example mix. This estimate covers the income portion only; the
            other assets earn no interest. It is before Banda’s fee and leaves
            out price changes and extra rewards. Rates change and this is not a
            guaranteed return. On this test version it earns nothing yet.
          </p>
          <p>
            Rate as of {yieldDate(yieldSnapshotDate)}. Each asset card shows its
            own rate and source.
          </p>
        </details>
      )}
    </div>
  );
}
