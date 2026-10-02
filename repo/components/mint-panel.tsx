"use client";
import { useState } from "react";
import { useWallet } from "./wallet";
import { WaveBand } from "./guilloche";

export function MintPanel() {
  const wallet = useWallet();
  const [amount, setAmount] = useState("100");
  const busy = ["preparing", "signing", "confirming"].includes(wallet.transactionStatus);
  return (
    <form
      className="buy-panel mint-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!wallet.connected) {
          wallet.connect();
          return;
        }
        await wallet.mintTestUsdg(amount).catch(() => undefined);
      }}
    >
      <WaveBand className="terms-wave" />
      <span className="certificate-kind">Free test money</span>
      <h2>Get test USDG</h2>
      <p>Test USDG goes to your connected wallet. It is test money with no real value.</p>
      <label htmlFor="mint-amount">Amount in test USDG</label>
      <input
        id="mint-amount"
        inputMode="decimal"
        type="number"
        min="0.000001"
        max="10000"
        step="any"
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
        }}
        required
      />
      <div className="quick-chips">
        {["100", "1000", "10000"].map((value) => (
          <button type="button" key={value} aria-pressed={amount === value} onClick={() => setAmount(value)}>
            {Number(value).toLocaleString("en-US")}
          </button>
        ))}
      </div>
      <p>
        {wallet.connected ? (
          <>Wallet balance: <span className="mono">{wallet.balanceLabel} USDG</span></>
        ) : "Connect a wallet to get test USDG."}
      </p>
      <button className="primary-button" type="submit" disabled={wallet.connected && busy}>
        {!wallet.connected
          ? "Connect wallet"
          : wallet.transactionStatus === "signing"
            ? "Approve in your wallet…"
            : wallet.transactionStatus === "confirming"
              ? "Confirming…"
              : busy
                ? "Preparing…"
                : `Get ${Number(amount || 0).toLocaleString("en-US")} test USDG`}{" "}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
