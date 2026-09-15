import { ASSET_FACTS } from "@/lib/assets";
import type { Basket } from "@/lib/mock";
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
          <span>Est. APY</span>
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
                    Snapshot: {yieldDate(estimate.asOf)}. Variable, before Banda
                    fees.
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
            yield
            <strong className="basket-apy mono">
              {basketYield(basket).toFixed(2)}% <span>est. APY</span>
            </strong>
          </summary>
          <p>
            {yielding.map((h) => `${h.ticker} (${h.weight}%)`).join(" · ")} of
            the example allocation. Allocation-weighted estimate from the
            yield-bearing assets; other assets contribute zero yield. Before
            Banda fees, excluding price changes and additional incentives. Rates
            vary, not a guaranteed portfolio return.
          </p>
          <p>
            Rate snapshot: {yieldDate(yieldSnapshotDate)}. Asset cards show
            individual rates and sources.
          </p>
        </details>
      )}
    </div>
  );
}
