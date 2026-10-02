"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatUnits } from "viem";
import { useWallet, type WalletPosition } from "./wallet";
import type { BasketValuation } from "@/lib/chain/valuation";

export function RedeemPanel({ position, valuation }: { position: WalletPosition; valuation?: BasketValuation }) {
  const wallet = useWallet();
  const [percentage, setPercentage] = useState(25);
  const [quote, setQuote] = useState<readonly [bigint, bigint, bigint]>();
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [engaged, setEngaged] = useState(false);
  const lastWarm = useRef(0);
  const warmRedemption = wallet.warmRedemption;
  const units = BigInt(position.shares) * BigInt(percentage) / BigInt(100);
  const shares = formatUnits(units, 6);
  const busy = wallet.transactionStatus === "preparing" || wallet.transactionStatus === "signing" || wallet.transactionStatus === "confirming";
  const preview = wallet.previewRedemption;
  useEffect(() => {
    let cancelled = false;
    setQuote(undefined);
    setStatus("loading");
    if (units === BigInt(0)) return;
    const timer = setTimeout(() => {
      void preview(position.tokenId, shares).then(value => {
        if (!cancelled) { setQuote(value); setStatus("ready"); }
      }).catch(() => {
        if (cancelled) return;
        if (!engaged || Date.now() - lastWarm.current < 30_000) { setStatus("unavailable"); return; }
        lastWarm.current = Date.now();
        void warmRedemption(position.tokenId).then(() => { if (!cancelled) setRevision(value => value + 1); });
      });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [position.tokenId, shares, preview, units, revision, engaged, warmRedemption]);
  const engage = () => setEngaged(true);
  const estimate = valuation && BigInt(position.shares) > BigInt(0)
    ? valuation.value * units / BigInt(position.shares)
    : undefined;
  const estimated = quote === undefined && estimate !== undefined;
  const skeleton = <span className="value-skeleton" aria-label="Loading" />;
  const amount = (value: bigint | undefined, fallback: bigint | undefined, suffix = "") => value !== undefined
    ? formatUnits(value, 6) + suffix
    : fallback !== undefined ? `≈ ${Number(formatUnits(fallback, 6)).toFixed(2)}${suffix}` : skeleton;
  return <section className="redemption" aria-label={`Withdraw from ${position.name}`}>
    <div className="redemption-heading">
      <div><span className="eyebrow">MONEY BACK TO YOUR WALLET</span><h3>Withdraw from your Basket</h3></div>
      <output htmlFor={`portion-${position.tokenId}`} className="redemption-percentage">{percentage}<span>%</span></output>
    </div>
    <label className="sr-only" htmlFor={`portion-${position.tokenId}`}>Percentage of your Basket to withdraw</label>
    <input id={`portion-${position.tokenId}`} className="redemption-slider" type="range" min="1" max="100" step="1" value={percentage} disabled={busy}
      style={{"--portion": `${percentage}%`} as CSSProperties}
      aria-valuetext={`${percentage} percent of your Basket`}
      onPointerDown={engage} onKeyDown={engage} onChange={event => { engage(); setPercentage(Number(event.target.value)); }} />
    <div className="redemption-presets">{[25,50,75,100].map(value => <button key={value} type="button" disabled={busy} aria-pressed={percentage === value} onClick={() => { engage(); setPercentage(value); }}>{value === 100 ? "Everything" : `${value}%`}</button>)}</div>
    <dl className="redemption-summary">
      <div><dt>Units to withdraw</dt><dd>{shares}</dd></div>
      <div><dt>Yearly fee so far</dt><dd>{quote ? formatUnits(quote[1], 6) + " USDG" : estimated ? "0.25% a year, exact amount when you withdraw" : skeleton}</dd></div>
      <div className="redemption-payout"><dt>You get about</dt><dd>{amount(quote?.[2], estimate)} <small>USDG</small></dd></div>
      <div><dt>You get at least this, or nothing happens</dt><dd>{amount(quote ? quote[2] * BigInt(995) / BigInt(1000) : undefined, estimate === undefined ? undefined : estimate * BigInt(995) / BigInt(1000), " USDG")}</dd></div>
    </dl>
    <p className="redemption-note">{percentage === 100 ? "Withdraws everything and closes this Basket." : `Your Basket stays open with the other ${100 - percentage}%.`}</p>
    <button type="button" className="primary-button redemption-submit" disabled={busy || units === BigInt(0) || (quote !== undefined && quote[2] <= BigInt(0))} onClick={async () => {
      await wallet.redeem(position.tokenId, shares).catch(() => undefined);
      setRevision(value => value + 1);
    }}>{busy ? wallet.transactionStatus === "preparing" ? "Getting the latest prices…" : wallet.transactionStatus === "signing" ? "Approve in your wallet…" : "Confirming…" : percentage === 100 ? "Withdraw everything" : `Withdraw ${percentage}%`}</button>
    <p role="status" className="redemption-note">{quote ? "The money goes to the wallet that owns this Basket." : estimated ? "Estimate based on the last prices. We check the latest prices and show the exact amount when you withdraw." : status === "unavailable" ? "You see the exact amount when you withdraw." : "Checking what you would get…"}</p>
    <p className="redemption-note">You get your holdings’ value at live market prices, paid in test USDG.</p>
  </section>;
}
