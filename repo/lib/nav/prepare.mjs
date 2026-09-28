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
  const { gas, gasPrice, balance, pending, mined } = await chain.fees();
  const gasLimit = gas * 130n / 100n;
  const maxCost = gasLimit * gasPrice;
  if (gasPrice <= 0n || gasLimit <= 0n || maxCost > 20_000_000_000_000n) {
    throw new NavError("FEE_LIMIT", "Quote update fees exceed the demo safety limit.");
  }
  if (balance < maxCost + 100_000_000_000_000n) throw new NavError("LOW_GAS", "Quote service needs operator gas funding.");
  if (pending !== mined) throw new NavError("PENDING_NONCE", "The operator has a pending transaction. Please retry later.");
  await journal.reserve(strategyId, { nonce: pending });
  const hash = await chain.send(args, { gas: gasLimit, gasPrice, nonce: pending });
  await journal.submitted(hash);
  log("nav_submitted", { strategyId, hash });
  const receipt = await chain.receipt(hash);
  await journal.settled();
  if (receipt.status !== "success") throw new NavError("UPDATE_REVERTED", "Quote refresh reverted. No user transaction was sent.");
  const after = await chain.snapshot(strategyId);
  if (!same(after.adapter, ADAPTER) ||
      shouldRefresh(after.quote, metadata(after.header), BigInt(after.age), BigInt(after.lag))) {
    throw new NavError("NOT_FRESH", "The quote is not ready yet. Please retry shortly.");
  }
  log("nav_confirmed", { strategyId, hash });
  return { status: "refreshed", strategyId, source: "testnet-mock", hash };
}
