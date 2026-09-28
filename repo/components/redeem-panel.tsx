"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { formatUnits } from "viem";
import { useWallet, type WalletPosition } from "./wallet";

export function RedeemPanel({ position }: { position: WalletPosition }) {
  const wallet = useWallet();
  const [percentage, setPercentage] = useState(25);
  const [quote, setQuote] = useState<readonly [bigint, bigint, bigint]>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const units = BigInt(position.shares) * BigInt(percentage) / BigInt(100);
  const shares = formatUnits(units, 6);
  const busy = wallet.transactionStatus === "signing" || wallet.transactionStatus === "confirming";
  const preview = wallet.previewRedemption;
  useEffect(() => {
    let cancelled = false;
    setQuote(undefined);
    setError("");
    if (units === BigInt(0)) return;
    const timer = setTimeout(() => {
      void preview(position.tokenId, shares).then(value => {
        if (!cancelled) setQuote(value);
      }).catch(() => {
        if (!cancelled) setError("Live quote unavailable. Check your network or wait for a fresh NAV.");
      });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [position.tokenId, shares, preview, units]);
  return <section className="redemption" aria-label={`Redeem ${position.name}`}>
    <div className="redemption-heading">
      <div><span className="eyebrow">WITHDRAW TO YOUR WALLET</span><h3>Redeem your Basket</h3></div>
      <output htmlFor={`portion-${position.tokenId}`} className="redemption-percentage">{percentage}<span>%</span></output>
    </div>
    <label className="sr-only" htmlFor={`portion-${position.tokenId}`}>Percentage of shares to redeem</label>
    <input id={`portion-${position.tokenId}`} className="redemption-slider" type="range" min="1" max="100" step="1" value={percentage} disabled={busy}
      style={{"--portion": `${percentage}%`} as CSSProperties}
      aria-valuetext={`${percentage} percent, ${shares} shares`}
      onChange={event => {setPercentage(Number(event.target.value)); setMessage("");}} />
    <div className="redemption-presets">{[25,50,75,100].map(value => <button key={value} type="button" disabled={busy} aria-pressed={percentage === value} onClick={() => {setPercentage(value); setMessage("");}}>{value === 100 ? "All" : `${value}%`}</button>)}</div>
    <dl className="redemption-summary">
      <div><dt>Shares to redeem</dt><dd>{shares}</dd></div>
      <div><dt>Management fee</dt><dd>{quote ? formatUnits(quote[1], 6) + " USDG" : "—"}</dd></div>
      <div className="redemption-payout"><dt>Estimated payout</dt><dd>{quote ? formatUnits(quote[2], 6) : "—"} <small>USDG</small></dd></div>
      <div><dt>Minimum received · 0.5% tolerance</dt><dd>{quote ? formatUnits(quote[2] * BigInt(995) / BigInt(1000), 6) + " USDG" : "—"}</dd></div>
    </dl>
    <p className="redemption-note">{percentage === 100 ? "Redeems all shares and closes this Basket. Its NFT will be burned." : `Your Basket stays open with ${formatUnits(BigInt(position.shares) - units, 6)} shares.`}</p>
    <button className="primary-button redemption-submit" disabled={busy || !quote || units === BigInt(0) || quote[2] <= BigInt(0)} onClick={async () => {
      setMessage("");
      try { await wallet.redeem(position.tokenId, shares); setMessage("Redemption confirmed."); }
      catch {setMessage("Redemption could not complete. Check the wallet transaction status before retrying.");}
    }}>{busy ? wallet.transactionStatus === "signing" ? "Confirm in wallet…" : "Confirming…" : percentage === 100 ? "Redeem entire Basket" : `Redeem ${percentage}%`}</button>
    <p role="status" className="redemption-note">{message || error || (!quote ? "Checking live payout…" : "Payout goes to the Basket owner’s wallet.")}</p>
  </section>;
}
