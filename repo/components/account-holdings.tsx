"use client";
import { useEffect, useState } from "react";
import { createPublicClient, formatUnits, http, parseAbi, type Address } from "viem";
import { CANONICAL_TESTNET_TICKERS, ROBINHOOD_TESTNET } from "@/lib/chain/config";
import { ASSETS } from "@/constants/baskets";
import { AssetLogo } from "./asset-label";
import styles from "./account-holdings.module.css";

type Holding = { ticker: string; amount: string };

const client = createPublicClient({ chain: ROBINHOOD_TESTNET, transport: http() });
const abi = parseAbi([
  "function strategy(uint32) view returns (address,uint96,uint16,address,bool)",
  "function legs() view returns (address[],uint16[])",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);
const tickerOf = (symbol: string) => (symbol === "WETH" ? "ETH" : symbol);

/** Reads the tokens a Basket's ERC-6551 account actually holds, straight from the chain. */
export function AccountHoldings({ account, strategyId, refreshKey }: { account: string; strategyId: number; refreshKey: string }) {
  const [holdings, setHoldings] = useState<Holding[]>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [strategy] = await client.readContract({ address: ROBINHOOD_TESTNET.diamond, abi, functionName: "strategy", args: [strategyId] });
      const [tokens] = await client.readContract({ address: strategy, abi, functionName: "legs" }).catch(() => [[] as readonly Address[]]);
      const rows = await Promise.all(tokens.map(async (token) => {
        const [symbol, decimals, balance] = await Promise.all([
          client.readContract({ address: token, abi, functionName: "symbol" }),
          client.readContract({ address: token, abi, functionName: "decimals" }),
          client.readContract({ address: token, abi, functionName: "balanceOf", args: [account as Address] }),
        ]);
        const ticker = tickerOf(symbol);
        return { ticker, amount: Number(formatUnits(balance, decimals)).toLocaleString("en-US", { maximumSignificantDigits: 6 }) };
      }));
      if (!cancelled) setHoldings(rows);
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [account, strategyId, refreshKey]);
  if (failed) return <p className={styles.note}>Holdings could not be read right now.</p>;
  if (!holdings) return <p className={styles.note}>Reading holdings from the Basket account…</p>;
  if (holdings.length === 0) return null;
  return (
    <div className={styles.holdings}>
      <div className={styles.head}>
        <span>Held in this Basket’s account</span>
        <a href={`${ROBINHOOD_TESTNET.explorer}/address/${account}`} target="_blank" rel="noreferrer">View onchain ↗</a>
      </div>
      <ul className={styles.list}>
        {holdings.map((holding) => (
          <li key={holding.ticker}>
            {ASSETS[holding.ticker] ? <AssetLogo ticker={holding.ticker} /> : <span className="asset-logo" aria-hidden="true" />}
            <span className={styles.name}>
              <strong>{holding.ticker}</strong>
              {(CANONICAL_TESTNET_TICKERS as readonly string[]).includes(holding.ticker)
                ? <small className={styles.canonical}>Canonical testnet token</small>
                : <small>Testnet mock</small>}
            </span>
            <span className={`mono ${styles.amount}`}>{holding.amount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
