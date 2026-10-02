"use client";
import { useState } from "react";
import Link from "next/link";
import { BASKETS, type Basket, money } from "@/constants/baskets";
import { useWallet } from "./wallet";
import { NavNumber } from "./certificate";
import { Rosette, WaveBand } from "./guilloche";
import { BasketExplorer } from "./basket-explorer";
import { STRATEGY_IDS } from "@/lib/chain/config";
export function BasketDetail({ basket }: { basket: Basket }) {
  const wallet = useWallet();
  const [amount, setAmount] = useState("500");
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && value <= wallet.balance;
  const strategyId = STRATEGY_IDS[BASKETS.findIndex((entry) => entry.slug === basket.slug)];
  const warm = () => { if (wallet.connected) wallet.warmUp(strategyId); };
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
              <span>Example: $10,000 over the last 30 days</span>
              <strong className="detail-nav">
                <NavNumber value={basket.nav} />
              </strong>
              <details className="valuation-details">
                <summary>About this value</summary>
                <p>
                  What $10,000 put into this Basket 30 days before the last close
                  would be worth now, using today’s mix and real daily closing prices
                  (Yahoo Finance and CoinGecko, checked against live Chainlink prices).
                  This is an example, not a real holding.
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
              await wallet.deposit(strategyId, amount).catch(() => undefined);
            }
          }}
        >
          <WaveBand className="terms-wave" />
          <span className="certificate-kind">Buy</span>
          <h2>Buy {basket.name}</h2>
          <p>Choose an amount in USDG, a digital dollar. You get one Basket that holds the whole mix.</p>
          <label htmlFor="amount">Amount in USDG</label>
          <input
            id="amount"
            inputMode="decimal"
            type="number"
            min="0.000001"
            step="any"
            value={amount}
            onFocus={warm}
            onChange={(e) => {
              warm();
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
                  warm();
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
            You get <span className="mono">1</span> Basket worth{" "}
            <span className="mono">
              {money(Number.isFinite(value) && value > 0 ? value : 0)}
            </span>{" "}
            in {basket.name}.
          </div>
          <div className="fee-line">
            <span>Fee to buy</span>
            <span className="mono">0%</span>
          </div>
          <div className="fee-line">
            <span>Yearly fee</span>
            <span className="mono">{basket.managementFee}% a year</span>
          </div>
          <p>
            No fee to buy or withdraw, and no performance fee. The yearly fee is charged in tiny amounts over time, only when you withdraw, and you see it before you approve.
          </p>
          <button
            className="primary-button"
            type="submit"
            disabled={wallet.connected && (!valid || wallet.transactionStatus === "preparing" || wallet.transactionStatus === "signing" || wallet.transactionStatus === "confirming")}
          >
            {!wallet.connected
              ? "Connect wallet"
              : wallet.transactionStatus === "preparing"
                ? "Getting the latest prices…"
              : wallet.transactionStatus === "signing"
                ? "Approve in your wallet…"
                : wallet.transactionStatus === "confirming"
                  ? "Confirming…"
                  : "Deposit now"}{" "}
            <span aria-hidden="true">→</span>
          </button>
          {wallet.connected && value > wallet.balance && (
            <p role="alert">That is more than your available balance.</p>
          )}
          <p>
            This is a test version with test USDG. Nothing here has real value.
            Buying takes two approvals in your wallet: first you let Banda use your
            USDG, then you make the deposit. Each holding goes into your Basket’s own
            vault as a practice version of the real asset, bought and sold at live
            market prices.
          </p>
        </form>
      </div>
      </div>
    </main>
  );
}
