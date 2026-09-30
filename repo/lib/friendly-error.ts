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
  [/stale NAV|stale-block NAV|future-block NAV|invalid NAV|nav guard/i, "The Basket price quote expired before your transaction landed. Nothing was spent; please try again."],
  [/Banda: paused/, "Deposits are paused right now. Redemptions stay open."],
  [/strategy disabled/, "This Basket is not accepting deposits right now."],
  [/deposit too small/, "That deposit is below this Basket’s minimum."],
  [/minimum payout/, "The payout moved more than 0.5% while you were signing. Nothing was redeemed; please try again."],
  [/not basket authority|not approved/, "This wallet is not allowed to manage that Basket."],
  [/lifecycle busy/, "This Basket is busy with another transaction. Please try again in a moment."],
  [/basket missing|token missing/, "That Basket no longer exists. It may have been fully redeemed."],
  [/invalid shares|empty redeem/, "Choose an amount of shares to redeem."],
  [/fee exceeds proceeds|fee insolvent/, "That redemption is too small to cover its fee."],
  [/ERC20: balance/, "Not enough test USDG in this wallet."],
  [/ERC20: allowance/, "USDG spending was not approved. Please try again and approve the deposit."],
  [/recipient rejected|payout failed|transfer failed/, "The token transfer was rejected. Nothing was changed."],
];

const PLAIN = /^[^\n]{1,180}$/;

export const CANCELLED = "Request cancelled in your wallet. Nothing was sent.";

/** Turns wallet, RPC and contract failures into one short sentence a person can act on. */
export function friendlyError(reason: unknown, fallback = "Something went wrong. Nothing was sent; please try again."): string {
  if (reason instanceof BaseError) {
    if (reason.walk((error) => error instanceof UserRejectedRequestError)) return CANCELLED;
    if (reason.walk((error) => error instanceof InsufficientFundsError)) return "This wallet needs a little testnet ETH for gas.";
    if (reason.walk((error) => error instanceof ChainMismatchError)) return "Switch your wallet to Robinhood Chain testnet and try again.";
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
