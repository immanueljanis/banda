"use client";
import { useState } from "react";
import Link from "next/link";
import { BASKETS, type Basket, money } from "@/constants/baskets";
import { useWallet } from "./wallet";
import { NavNumber } from "./certificate";
import { BasketExplorer } from "./basket-explorer";
export function BasketDetail({ basket }: { basket: Basket }) {
  const wallet = useWallet();
  const [amount, setAmount] = useState("500");
  const [message, setMessage] = useState("");
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && value <= wallet.balance;
  return (
    <main id="main" className="detail wrap">
      <Link className="breadcrumb" href="/#baskets">
        ← All baskets
      </Link>
      <div className="detail-intro">
        <div>
          <span className="eyebrow">
            {basket.thesis} · {basket.character}
          </span>
          <h1>{basket.name}</h1>
          <p>{basket.mandate}</p>
        </div>
        <span className="example-tag">Illustrative data</span>
      </div>
      <div className="detail-layout">
        <div className="detail-content">
          <div className="detail-value-summary">
            <div>
              <span className="eyebrow">Example portfolio value</span>
              <div className="detail-nav">
                <NavNumber value={basket.nav} />
              </div>
            </div>
            <details className="valuation-details">
              <summary>About this value</summary>
              <p>
                Illustrative value, not a live price.
                <br />
                Example block{" "}
                <span className="mono">
                  {basket.block.toLocaleString("en-US")}
                </span>
                .
              </p>
            </details>
          </div>
          <BasketExplorer basket={basket} />
        </div>
        <form
          className="buy-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!wallet.connected) {
              wallet.connect();
              return;
            }
            if (valid) {
              setMessage("Preparing approval…");
              try {
                const strategyId = BASKETS.findIndex((entry) => entry.slug === basket.slug) + 1;
                const hash = await wallet.deposit(strategyId, amount);
                setMessage(`Deposit confirmed: ${hash.slice(0, 10)}…`);
              } catch (reason) {
                setMessage(
                  reason instanceof Error ? reason.message : "Deposit failed",
                );
              }
            }
          }}
        >
          <h2>Your portfolio starts here.</h2>
          <p>Choose an amount. See your allocation across this strategy.</p>
          <label htmlFor="amount">Amount in USDG</label>
          <input
            id="amount"
            inputMode="decimal"
            type="number"
            min="0.000001"
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setMessage("");
            }}
            required
          />
          <div className="quick-chips">
            {[50, 500].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => {
                  setAmount(String(n));
                  setMessage("");
                }}
              >
                ${n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(String(wallet.balance))}
            >
              Max
            </button>
          </div>
          <p>
            Available balance:{" "}
            <span className="mono">{money(wallet.balance)} USDG</span>
          </p>
          <div className="buy-preview">
            You will receive <span className="mono">1</span> basket holding{" "}
            <span className="mono">
              {money(Number.isFinite(value) && value > 0 ? value : 0)}
            </span>{" "}
            in {basket.name}.
          </div>
          <div className="fee-line">
            <span>Purchase fee</span>
            <span className="mono">0%</span>
          </div>
          <div className="fee-line">
            <span>Management fee</span>
            <span className="mono">{basket.managementFee}% / year</span>
          </div>
          <p>
            Management fee for this mandate. No performance fee in the MVP. Fee
            accrual is not implemented in this local demonstration.
          </p>
          <button
            className="primary-button"
            type="submit"
            disabled={wallet.connected && !valid}
          >
            {!wallet.connected
              ? "Connect wallet"
              : wallet.transactionStatus === "signing"
                ? "Confirm in wallet…"
                : wallet.transactionStatus === "confirming"
                  ? "Confirming…"
                  : wallet.transactionStatus === "success"
                    ? "Deposit confirmed"
                    : "Deposit now"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          {wallet.connected && value > wallet.balance && (
            <p role="alert">Amount exceeds your available balance.</p>
          )}
          <div className="status" role="status">
            {message}
            {message && (
              <>
                <br />
                <Link className="empty-link" href="/portfolio">
                  View portfolio →
                </Link>
              </>
            )}
          </div>
          <p>
            Balance and transactions use Robinhood testnet. Deposit requires two
            wallet confirmations: USDG approval, then the Basket deposit.
          </p>
        </form>
      </div>
    </main>
  );
}
