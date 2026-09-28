import { NavError } from "./errors.mjs";

export function strategyInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== 1 || !Number.isInteger(value.strategyId) ||
      value.strategyId < 1 || value.strategyId > 5) {
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
