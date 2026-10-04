import { metadata, shouldRefresh } from "../../scripts/nav-policy.mjs";
import { NavError } from "./errors.mjs";

export const DIAMOND = "0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7";
export const ADAPTER = "0x50EB95DB909e7870B48D24c01234e69a19066011";
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

/**
 * Injected transport/journal allow lifecycle tests without signing live txs.
 * Preserves the mock price exactly; the browser never supplies price or metadata.
 * Never retries a send automatically: a timeout can mean the node accepted it.
 */
export async function prepareQuote(strategyId, chain, journal, log = () => {}) {
  if (await chain.chainId() !== 46630) throw new NavError("WRONG_CHAIN", "Quote service is on the wrong network.");
  const snapshot = await chain.snapshot(strategyId);
  const { adapter, age, lag, operator, owner, quote, header } = snapshot;
  if (!same(adapter, ADAPTER)) throw new NavError("ADAPTER_CHANGED", "Quote service needs an adapter configuration review.");
  if (!same(chain.signer, operator) || same(chain.signer, owner)) throw new NavError("WRONG_SIGNER", "Quote service requires the dedicated operator.");
  const head = metadata(header);
  if (!shouldRefresh(quote, head, BigInt(age), BigInt(lag))) return { status: "fresh", strategyId, source: "testnet-mock" };
  const args = [snapshot.strategy, quote[0], head.time, head.block, true];
  await chain.simulate(args);
  const hash = await submit("nav", strategyId, await chain.fees(), fees => chain.send(args, fees), chain, journal, log);
  const after = await chain.snapshot(strategyId);
  if (!same(after.adapter, ADAPTER) ||
      shouldRefresh(after.quote, metadata(after.header), BigInt(after.age), BigInt(after.lag))) {
    throw new NavError("NOT_FRESH", "The quote is not ready yet. Please retry shortly.");
  }
  log("nav_confirmed", { strategyId, hash });
  return { status: "refreshed", strategyId, source: "testnet-mock", hash };
}

/**
 * Sends one operator transaction under the shared safety rules: fee cap, gas reserve, no pending nonce,
 * journal intent persisted before the single send, and no automatic retry after an ambiguous result.
 */
async function submit(kind, strategyId, { gas, gasPrice, balance, pending, mined }, send, chain, journal, log) {
  const gasLimit = gas * 130n / 100n;
  const maxCost = gasLimit * gasPrice;
  if (gasPrice <= 0n || gasLimit <= 0n || maxCost > 20_000_000_000_000n) {
    throw new NavError("FEE_LIMIT", "Quote update fees exceed the demo safety limit.");
  }
  if (balance < maxCost + 100_000_000_000_000n) throw new NavError("LOW_GAS", "Quote service needs operator gas funding.");
  if (pending !== mined) throw new NavError("PENDING_NONCE", "The operator has a pending transaction. Please retry later.");
  await journal.reserve(strategyId, { nonce: pending, kind });
  const hash = await send({ gas: gasLimit, gasPrice, nonce: pending });
  await journal.submitted(hash);
  log(`${kind}_submitted`, { strategyId, hash });
  const receipt = await chain.receipt(hash);
  await journal.settled();
  if (receipt.status !== "success") throw new NavError("UPDATE_REVERTED", "Quote refresh reverted. No user transaction was sent.");
  return hash;
}

/**
 * Republishes live market prices for a Basket's legs once any is past half its pool lifetime.
 * Prices come only from `fetchPrices` (server-side sources), never from the browser. Moves beyond the
 * pool's deviation bound are refused before broadcast. Snapshot-priced legacy pools are left untouched.
 */
export async function preparePrices(strategyId, chain, journal, fetchPrices, log = () => {}) {
  const snapshot = await chain.priceSnapshot(strategyId);
  if (!snapshot) return { status: "fixed", strategyId };
  const { updater, maxAge, maxDeviationBps, now, legs } = snapshot;
  if (!same(chain.signer, updater)) throw new NavError("WRONG_SIGNER", "Price service requires the dedicated operator.");
  const due = legs.filter(leg => now - leg.updatedAt >= maxAge / 2n);
  if (due.length === 0) return { status: "fresh", strategyId };
  const live = await fetchPrices(due.map(leg => leg.symbol));
  const missing = due.filter(leg => typeof live.get(leg.symbol) !== "bigint").map(leg => leg.symbol);
  if (missing.length) log("prices_missing", { strategyId, symbols: missing.join(",") });
  const prices = due.map(leg => {
    const price = live.get(leg.symbol);
    if (typeof price !== "bigint" || price <= 0n) throw new NavError("PRICE_UNAVAILABLE", "Live prices are unavailable right now. Please retry shortly.");
    const difference = price > leg.price ? price - leg.price : leg.price - price;
    if (difference * 10_000n > leg.price * maxDeviationBps) throw new NavError("PRICE_JUMP", "A market price moved too far to publish automatically. Please retry later.");
    return price;
  });
  const args = [due.map(leg => leg.token), prices];
  await chain.simulatePrices(args);
  const hash = await submit("prices", strategyId, await chain.pricesFees(args), fees => chain.sendPrices(args, fees), chain, journal, log);
  const after = await chain.priceSnapshot(strategyId);
  if (after.legs.some(leg => after.now - leg.updatedAt >= after.maxAge / 2n)) {
    throw new NavError("NOT_FRESH", "Prices are not ready yet. Please retry shortly.");
  }
  log("prices_confirmed", { strategyId, hash });
  return { status: "refreshed", strategyId, hash };
}
