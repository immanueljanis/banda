"use client";
import { useState } from "react";
import Link from "next/link";
import { BASKETS, type Basket, money } from "@/constants/baskets";
import { useWallet } from "./wallet";
import { NavNumber } from "./certificate";
import { Rosette, WaveBand } from "./guilloche";
import { BasketExplorer } from "./basket-explorer";
export function BasketDetail({ basket }: { basket: Basket }) {
  const wallet = useWallet();
  const [amount, setAmount] = useState("500");
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && value <= wallet.balance;
  return (
    <main id="main">
      <section className="detail-note">
        <Rosette className="hero-rosette" />
        <div className="wrap detail-hero">
          <Link className="breadcrumb" href="/#baskets">
            ← All Baskets
          </Link>
          <div className="detail-intro">
            <div>
              <span className="certificate-serial mono">No. {basket.id}</span>
              <h1>{basket.name}</h1>
              <p className="detail-thesis">{basket.thesis} · {basket.character}</p>
              <p>{basket.mandate}</p>
            </div>
            <div className="detail-value">
              <span>Example portfolio value</span>
              <strong className="detail-nav">
                <NavNumber value={basket.nav} />
              </strong>
              <details className="valuation-details">
                <summary>About this value</summary>
                <p>
                  Illustrative value, not a live price. Example block{" "}
                  <span className="mono">{basket.block.toLocaleString("en-US")}</span>.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
      <div className="detail wrap">
      <div className="detail-layout">
        <div className="detail-content">
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
              const strategyId = BASKETS.findIndex((entry) => entry.slug === basket.slug) + 1;
              await wallet.deposit(strategyId, amount).catch(() => undefined);
            }
          }}
        >
          <WaveBand className="terms-wave" />
          <span className="certificate-kind">Subscription</span>
          <h2>Buy {basket.name}</h2>
          <p>Choose an amount in USDG. You receive one Basket NFT that holds the whole mix.</p>
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
            No performance fee. Fee accrual is not yet implemented on testnet.
          </p>
          <button
            className="primary-button"
            type="submit"
            disabled={wallet.connected && (!valid || wallet.transactionStatus === "preparing" || wallet.transactionStatus === "signing" || wallet.transactionStatus === "confirming")}
          >
            {!wallet.connected
              ? "Connect wallet"
              : wallet.transactionStatus === "preparing"
                ? "Preparing quote…"
              : wallet.transactionStatus === "signing"
                ? "Confirm in wallet…"
                : wallet.transactionStatus === "confirming"
                  ? "Confirming…"
                  : wallet.transactionStatus === "success"
                    ? "Deposit confirmed"
                    : "Deposit now"}{" "}
            <span aria-hidden="true">→</span>
          </button>
          {wallet.connected && value > wallet.balance && (
            <p role="alert">Amount exceeds your available balance.</p>
          )}
          <p>
            Balance and transactions use Robinhood testnet. Deposit requires two
            wallet confirmations: USDG approval, then the Basket deposit.
          </p>
        </form>
      </div>
      </div>
    </main>
  );
}
