import { NavError } from "./errors.mjs";

/** Holding-in-account Baskets: 6-10 at snapshot prices and 11-15 at published market prices. */
export const STRATEGY_IDS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function strategyInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== 1 || !STRATEGY_IDS.includes(value.strategyId)) {
    throw new NavError("BAD_REQUEST", "Select a supported Basket strategy.", 400);
  }
  return value.strategyId;
}

/** Bounded per-process limits. Durable broadcast limits live in the journal. */
export function createLimiter(now = Date.now) {
  const users = new Map();
  let global = [];
  return subject => {
    const cutoff = now() - 60_000;
    global = global.filter(time => time > cutoff);
    for (const [id, times] of users) {
      const recent = times.filter(time => time > cutoff);
      if (recent.length) users.set(id, recent); else users.delete(id);
    }
    const recent = users.get(subject) ?? [];
    if (recent.length >= 12 || global.length >= 60) {
      throw new NavError("RATE_LIMIT", "Too many quote requests. Please wait a minute.", 429);
    }
    recent.push(now());
    global.push(now());
    users.set(subject, recent);
  };
}

/** One signer queue across all five strategies, with same-strategy single-flight. */
export function createCoordinator(prepare) {
  const pending = new Map();
  let tail = Promise.resolve();
  return strategyId => {
    if (pending.has(strategyId)) return pending.get(strategyId);
    const task = tail.then(() => prepare(strategyId));
    pending.set(strategyId, task);
    tail = task.then(() => undefined, () => undefined);
    void task.finally(() => pending.delete(strategyId)).catch(() => undefined);
    return task;
  };
}
