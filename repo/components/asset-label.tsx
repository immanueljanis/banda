"use client";
import { useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ASSETS, ASSET_FACTS } from "@/constants/baskets";
export function AssetLogo({ ticker }: { ticker: string }) {
  return (
    <img
      className="asset-logo"
      src={`/assets/tickers/${ticker.toLowerCase()}.png`}
      width={32}
      height={32}
      alt={`${ASSETS[ticker].name} mark`}
    />
  );
}
export function AssetLabel({
  ticker,
  compact = false,
}: {
  ticker: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wasOpen = useRef(false);
  const asset = ASSETS[ticker];
  return (
    <Tooltip.Provider delayDuration={180}>
      <Tooltip.Root open={open}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={`asset-label ${compact ? "asset-compact" : ""}`}
            aria-label={`About ${ticker}: ${asset.name}`}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            onPointerDown={() => {
              wasOpen.current = open;
            }}
            onClick={(event) => {
              event.preventDefault();
              setOpen(event.detail === 0 ? true : !wasOpen.current);
            }}
          >
            <AssetLogo ticker={ticker} />
            <span>
              {compact ? (
                <span className="mono">{ticker}</span>
              ) : (
                <>
                  <strong>{asset.name}</strong>
                  <small className="mono">{ticker}</small>
                </>
              )}
            </span>
            {!compact && (
              <span className="asset-info" aria-hidden="true">
                i
              </span>
            )}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="asset-tooltip"
            sideOffset={9}
            collisionPadding={16}
          >
            <strong>
              {asset.name} <span className="mono">({ticker})</span>
            </strong>
            <p>{asset.description}</p>
            {ASSET_FACTS[ticker]?.yield && (
              <p>
                <b>{ASSET_FACTS[ticker].yield!.label}.</b>{" "}
                {ASSET_FACTS[ticker].yield!.detail}
              </p>
            )}
            {!ASSET_FACTS[ticker]?.yield && (
              <p>
                This asset does not earn income on its own in this Basket.
              </p>
            )}
            <Tooltip.Arrow className="tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
