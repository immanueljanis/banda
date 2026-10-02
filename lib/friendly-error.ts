import {
  BaseError,
  ChainMismatchError,
  ContractFunctionRevertedError,
  HttpRequestError,
  InsufficientFundsError,
  TimeoutError,
  UserRejectedRequestError,
} from "viem";

const REVERTS: [RegExp, string][] = [
  [/stale NAV|stale-block NAV|future-block NAV|invalid NAV|nav guard/i, "The price check expired before your transaction went through. Nothing was spent; please try again."],
  [/Banda: paused/, "Deposits are paused right now. You can still withdraw."],
  [/strategy disabled/, "This Basket is not accepting deposits right now."],
  [/deposit too small/, "That amount is below this Basket’s minimum deposit."],
  [/minimum payout/, "Prices moved more than 0.5% while you were approving. Nothing was withdrawn; please try again."],
  [/not basket authority|not approved/, "This wallet is not allowed to manage that Basket."],
  [/lifecycle busy/, "This Basket is busy with another transaction. Please try again in a moment."],
  [/basket missing|token missing/, "That Basket no longer exists. It may have been fully withdrawn."],
  [/invalid shares|empty redeem/, "Choose how much to withdraw."],
  [/fee exceeds proceeds|fee insolvent/, "That withdrawal is too small to cover its fee."],
  [/inventory exhausted/, "One of this Basket’s test assets is out of stock right now. Try a smaller amount or another Basket."],
  [/ERC20: balance|transfer amount exceeds balance|insufficient balance/i, "Not enough USDG in this wallet. Get free testnet USDG from the Paxos faucet on the Get USDG page."],
  [/ERC20: allowance/, "Banda was not allowed to use your USDG. Please try again and approve it in your wallet."],
  [/recipient rejected|payout failed|transfer failed/, "The transfer was rejected. Nothing was changed."],
];

const PLAIN = /^[^\n]{1,180}$/;

export const CANCELLED = "Request cancelled in your wallet. Nothing was sent.";

/** Turns wallet, RPC and contract failures into one short sentence a person can act on. */
export function friendlyError(reason: unknown, fallback = "Something went wrong. Nothing was sent; please try again."): string {
  if (reason instanceof BaseError) {
    if (reason.walk((error) => error instanceof UserRejectedRequestError)) return CANCELLED;
    if (reason.walk((error) => error instanceof InsufficientFundsError)) return "This wallet needs a little test ETH to pay the network fee.";
    if (reason.walk((error) => error instanceof ChainMismatchError)) return "Switch your wallet to the Robinhood Chain test network and try again.";
    if (reason.walk((error) => error instanceof TimeoutError || error instanceof HttpRequestError)) return "The network is slow to respond. Check your portfolio before retrying.";
    const revert = reason.walk((error) => error instanceof ContractFunctionRevertedError);
    const text = revert instanceof ContractFunctionRevertedError ? `${revert.reason ?? ""} ${revert.shortMessage}` : `${reason.shortMessage} ${reason.details ?? ""}`;
    return REVERTS.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
  }
  const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
  if (/user (rejected|denied)|rejected the request/i.test(message)) return CANCELLED;
  if (/failed to fetch|networkerror|load failed/i.test(message)) return "Could not reach Banda. Check your connection and try again.";
  if (/timed out|aborted|timeout/i.test(message)) return "That took too long to respond. Check your portfolio before retrying.";
  const known = REVERTS.find(([pattern]) => pattern.test(message));
  if (known) return known[1];
  return PLAIN.test(message) && !/0x[0-9a-f]{20,}/i.test(message) ? message : fallback;
}
