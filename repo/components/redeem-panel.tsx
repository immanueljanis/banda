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
  const [preparing, setPreparing] = useState(false);
  const [revision, setRevision] = useState(0);
  const units = BigInt(position.shares) * BigInt(percentage) / BigInt(100);
  const shares = formatUnits(units, 6);
  const busy = preparing || wallet.transactionStatus === "preparing" || wallet.transactionStatus === "signing" || wallet.transactionStatus === "confirming";
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
        if (!cancelled) setError("A current payout quote is needed. Prepare it before redeeming.");
      });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [position.tokenId, shares, preview, units, revision]);
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
    {!quote && <button type="button" className="primary-button redemption-submit" disabled={busy || units === BigInt(0)} onClick={async () => {
      setPreparing(true);
      setMessage("");
      setError("");
      try { await wallet.prepareRedemption(position.tokenId); setRevision(value => value + 1); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "Quote preparation failed. Please retry."); }
      finally { setPreparing(false); }
    }}>{preparing ? "Preparing payout…" : "Prepare payout"}</button>}
    {quote && <button type="button" className="primary-button redemption-submit" disabled={busy || units === BigInt(0) || quote[2] <= BigInt(0)} onClick={async () => {
      setMessage("");
      try { await wallet.redeem(position.tokenId, shares); setMessage("Redemption confirmed."); }
      catch (reason) {setMessage(reason instanceof Error ? reason.message : "Redemption could not complete. Check your wallet before retrying.");}
    }}>{busy ? wallet.transactionStatus === "preparing" ? "Preparing quote…" : wallet.transactionStatus === "signing" ? "Confirm in wallet…" : "Confirming…" : percentage === 100 ? "Redeem entire Basket" : `Redeem ${percentage}%`}</button>}
    <p role="status" className="redemption-note">{preparing ? "Refreshing the testnet quote if needed. No wallet signature is needed yet." : message || error || (!quote ? "Checking live payout…" : "Payout goes to the Basket owner’s wallet.")}</p>
    <p className="redemption-note">Testnet payout uses a mock NAV, not market pricing.</p>
  </section>;
}
