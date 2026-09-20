"use client";
import { useState } from "react";
import Link from "next/link";
import { type Basket, money } from "@/lib/mock";
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
          <h1>{basket.name}</h1>
          <p>{basket.mandate}</p>
        </div>
        <span className="example-tag">Demo portfolio</span>
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
          onSubmit={(e) => {
            e.preventDefault();
            if (!wallet.connected) {
              wallet.connect();
              return;
            }
            if (valid) {
              wallet.buy(basket.slug, value);
              setMessage(
                `Demo basket created with ${money(value)}. View it in your portfolio.`,
              );
            }
          }}
        >
          <h2>Your portfolio starts here.</h2>
          <p>Choose an amount. See your allocation across this strategy.</p>
          <label htmlFor="amount">Amount in USDC</label>
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
            Demo balance:{" "}
            <span className="mono">{money(wallet.balance)} USDC</span>
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
            <span className="mono">
              {basket.slug === "frontier" ? "2%" : "1%"} / year
            </span>
          </div>
          <p>
            {basket.slug === "frontier" ? "Alpha Play" : "Beta Play"} management
            fee. No performance fee in the MVP. Fee accrual is not implemented
            in this local demo.
          </p>
          <button
            className="primary-button"
            type="submit"
            disabled={wallet.connected && !valid}
          >
            {wallet.connected ? "Create demo basket" : "Connect demo wallet"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          {wallet.connected && value > wallet.balance && (
            <p role="alert">Amount exceeds your demo balance.</p>
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
            Simulation only. Balances reset when you reload. No wallet
            permissions or real funds are used.
          </p>
        </form>
      </div>
    </main>
  );
}
