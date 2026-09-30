import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { NavError } from "./errors.mjs";

/**
 * Place this directory on a Railway volume. Never share the key with a worker.
 * No stale-lock expiry: ambiguous broadcasts require receipt/nonce inspection.
 * The lock is retained before persistence/send, so disk failures also fail closed.
 */
export async function withJournal(directory, run, now = Date.now) {
  if (!directory || !isAbsolute(directory)) throw new NavError("STATE_CONFIG", "Quote preparation needs a configured state directory.");
  await mkdir(directory, { recursive: true });
  const lockPath = join(directory, "nav.lock");
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") throw new NavError("NAV_LOCKED", "Quote updates are busy or awaiting operator review. Please retry later.");
    throw error;
  }
  const path = join(directory, "nav-state.json");
  let retainLock = false;
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: now() }));
    await lock.sync();
    let state;
    try { state = JSON.parse(await readFile(path, "utf8")); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      state = { attempts: [], pending: null };
    }
    if (!Array.isArray(state.attempts) || state.attempts.some(item =>
      !Number.isSafeInteger(item.at) || item.at > now() || !Number.isInteger(item.strategyId) || item.strategyId < 1 || item.strategyId > 10)) {
      throw new NavError("JOURNAL_INVALID", "Quote update history needs operator review.");
    }
    if (state.pending) {
      retainLock = true;
      throw new NavError("NAV_PENDING", "A quote update needs operator review before retrying.");
    }
    const save = async () => {
      const temp = await open(`${path}.tmp`, "w", 0o600);
      try { await temp.writeFile(JSON.stringify(state)); await temp.sync(); }
      finally { await temp.close(); }
      await rename(`${path}.tmp`, path);
    };
    return await run({
      async reserve(strategyId, details = {}) {
        state.attempts = state.attempts.filter(item => item.at > now() - 86_400_000);
        if (state.attempts.length >= 30) throw new NavError("DAILY_LIMIT", "Today's demo quote-update limit has been reached. Please try again later.", 429);
        if (state.attempts.some(item => item.strategyId === strategyId && item.at > now() - 60_000)) {
          throw new NavError("COOLDOWN", "This Basket was refreshed recently. Please wait a minute.", 429);
        }
        state.attempts.push({ at: now(), strategyId });
        state.pending = { strategyId, at: now(), hash: null, ...details };
        retainLock = true;
        await save();
      },
      async submitted(hash) { state.pending.hash = hash; await save(); },
      async settled() {
        state.pending = null;
        await save();
        retainLock = false;
      },
    });
  } finally {
    await lock.close();
    if (!retainLock) await unlink(lockPath);
  }
}
