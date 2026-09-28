import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPair, exportSPKI, SignJWT } from "jose";
import { createAuthVerifier } from "../../lib/nav/auth.mjs";
import { createCoordinator, createLimiter, strategyInput } from "../../lib/nav/coordinator.mjs";
import { createHandler } from "../../lib/nav/handler.mjs";
import { withJournal } from "../../lib/nav/journal.mjs";
import { prepareQuote, ADAPTER } from "../../lib/nav/prepare.mjs";

function fixture(fresh = false) {
  const events = [];
  const snapshot = {
    adapter: ADAPTER, age: 900, lag: 20, operator: "0xoperator", owner: "0xadmin",
    strategy: "0xstrategy", enabled: true,
    header: { number: "0x7782c46", l1BlockNumber: "0xb3fb5a", timestamp: "0x6ab96804" },
    quote: [10n ** 18n, 1790535684n - (fresh ? 0n : 901n), 11795290n, true],
  };
  const journal = {
    reserve: async id => events.push(["reserve", id]),
    submitted: async hash => events.push(["submitted", hash]),
    settled: async () => events.push(["settled"]),
  };
  const chain = {
    signer: "0xoperator", chainId: async () => 46630,
    snapshot: async () => snapshot,
    simulate: async args => events.push(["simulate", args]),
    fees: async () => ({ gas: 60_000n, gasPrice: 10_000_000n, balance: 10n ** 18n, pending: 7, mined: 7 }),
    send: async (args, fees) => {
      events.push(["send", args, fees]);
      snapshot.quote = [args[1], args[2], args[3], args[4]];
      return "0xreceipt";
    },
    receipt: async () => ({ status: "success" }),
  };
  return { chain, journal, events, snapshot };
}

test("fresh quotes do not simulate, reserve budget or send", async () => {
  const f = fixture(true);
  assert.equal((await prepareQuote(1, f.chain, f.journal)).status, "fresh");
  assert.deepEqual(f.events, []);
});

test("stale quotes preserve price, use parent metadata, persist before sending and verify receipt", async () => {
  const f = fixture();
  const result = await prepareQuote(1, f.chain, f.journal);
  assert.equal(result.status, "refreshed");
  assert.deepEqual(f.events.map(event => event[0]), ["simulate", "reserve", "send", "submitted", "settled"]);
  assert.deepEqual(f.events[2][1], ["0xstrategy", 10n ** 18n, 1790535684n, 11795290n, true]);
  assert.deepEqual(f.events[2][2], { gas: 78000n, gasPrice: 10000000n, nonce: 7 });
});

test("disabled deposits do not prevent renewal needed by existing redemptions", async () => {
  const f = fixture();
  f.snapshot.enabled = false;
  assert.equal((await prepareQuote(1, f.chain, f.journal)).status, "refreshed");
});

for (const scenario of ["wrong chain", "admin key", "wrong operator", "adapter changed", "invalid quote", "future quote", "missing parent", "low balance", "high fee", "pending nonce", "simulation revert"]) {
  test(`${scenario} fails before any broadcast`, async () => {
    const f = fixture();
    if (scenario === "wrong chain") f.chain.chainId = async () => 1;
    if (scenario === "admin key") f.snapshot.owner = f.chain.signer;
    if (scenario === "wrong operator") f.snapshot.operator = "0xother";
    if (scenario === "adapter changed") f.snapshot.adapter = "0xother";
    if (scenario === "invalid quote") f.snapshot.quote[3] = false;
    if (scenario === "future quote") f.snapshot.quote[2] = 125316166n;
    if (scenario === "missing parent") delete f.snapshot.header.l1BlockNumber;
    const fees = await f.chain.fees();
    if (scenario === "low balance") f.chain.fees = async () => ({ ...fees, balance: 0n });
    if (scenario === "high fee") f.chain.fees = async () => ({ ...fees, gasPrice: 10n ** 18n });
    if (scenario === "pending nonce") f.chain.fees = async () => ({ ...fees, pending: 8 });
    if (scenario === "simulation revert") f.chain.simulate = async () => { throw Error("revert"); };
    await assert.rejects(prepareQuote(1, f.chain, f.journal));
    assert.equal(f.events.some(event => event[0] === "send" || event[0] === "reserve"), false);
  });
}

test("reverted receipt is never reported as ready", async () => {
  const f = fixture();
  f.chain.receipt = async () => ({ status: "reverted" });
  await assert.rejects(prepareQuote(1, f.chain, f.journal), { code: "UPDATE_REVERTED" });
});

test("receipt timeout never settles or retries send", async () => {
  const f = fixture();
  f.chain.receipt = async () => { throw Error("timeout"); };
  await assert.rejects(prepareQuote(1, f.chain, f.journal));
  assert.equal(f.events.filter(event => event[0] === "send").length, 1);
  assert.equal(f.events.some(event => event[0] === "settled"), false);
});

test("single-flight deduplicates same strategy and serializes different strategies", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const calls = [];
  const prepare = createCoordinator(async id => { calls.push(id); await gate; return id; });
  const a = prepare(1);
  const b = prepare(1);
  const c = prepare(2);
  assert.equal(a, b);
  await Promise.resolve();
  assert.deepEqual(calls, [1]);
  release();
  assert.deepEqual(await Promise.all([a, b, c]), [1, 1, 2]);
  assert.deepEqual(calls, [1, 2]);
});

test("a failed request does not poison the signer queue", async () => {
  let first = true;
  const prepare = createCoordinator(async () => { if (first) { first = false; throw Error("failed"); } return "ready"; });
  await assert.rejects(prepare(1));
  assert.equal(await prepare(1), "ready");
});

test("request schema rejects arbitrary addresses, prices and invalid strategy IDs", () => {
  for (const value of [null, [], { strategyId: 0 }, { strategyId: 6 }, { strategyId: "1" }, { strategyId: 1.5 }, { strategyId: 1, price: "1" }]) {
    assert.throws(() => strategyInput(value), { code: "BAD_REQUEST" });
  }
  assert.equal(strategyInput({ strategyId: 5 }), 5);
});

test("per-user and global limits expire without an unbounded identity map", () => {
  let now = 100_000;
  const limit = createLimiter(() => now);
  for (let n = 0; n < 12; n++) limit("user");
  assert.throws(() => limit("user"), { code: "RATE_LIMIT" });
  for (let n = 0; n < 48; n++) limit(`other${n}`);
  assert.throws(() => limit("another"), { code: "RATE_LIMIT" });
  now += 60_001;
  assert.doesNotThrow(() => limit("user"));
});

async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), "banda-nav-test-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test("durable lock survives an ambiguous broadcast and blocks a subsequent process", async t => {
  const path = await directory(t);
  const f = fixture();
  f.chain.send = async () => { throw Error("network timeout after send"); };
  await assert.rejects(withJournal(path, journal => prepareQuote(1, f.chain, journal)));
  const state = JSON.parse(await readFile(join(path, "nav-state.json"), "utf8"));
  assert.equal(state.pending.strategyId, 1);
  assert.equal(state.attempts.length, 1);
  await assert.rejects(withJournal(path, async () => {}), { code: "NAV_LOCKED" });
});

test("durable cooldown and rolling daily limit survive coordinator restarts", async t => {
  const path = await directory(t);
  let now = 1_000_000;
  const run = () => withJournal(path, async journal => { await journal.reserve(1); await journal.submitted("0xtx"); await journal.settled(); }, () => now);
  await run();
  await assert.rejects(run(), { code: "COOLDOWN" });
  for (let n = 1; n < 30; n++) { now += 60_001; await run(); }
  now += 60_001;
  await assert.rejects(run(), { code: "DAILY_LIMIT" });
  now += 86_400_001;
  await run();
});

const pair = await generateKeyPair("ES256", { extractable: true });
const publicKey = await exportSPKI(pair.publicKey);
const verify = createAuthVerifier("banda-app", publicKey);
const token = (aud = "banda-app", issuer = "privy.io", expiry = "1h") => new SignJWT({})
  .setProtectedHeader({ alg: "ES256" }).setSubject("did:privy:demo")
  .setIssuer(issuer).setAudience(aud).setIssuedAt().setExpirationTime(expiry).sign(pair.privateKey);

test("Privy verification checks signature, expiry, issuer and app audience", async () => {
  assert.equal(await verify(`Bearer ${await token()}`), "did:privy:demo");
  for (const value of [null, "Bearer invalid", `Bearer ${await token("other")}`, `Bearer ${await token("banda-app", "other")}`, `Bearer ${await token("banda-app", "privy.io", "-1h")}`]) {
    await assert.rejects(verify(value), { code: "UNAUTHORIZED" });
  }
  const otherPair = await generateKeyPair("ES256");
  const forged = await new SignJWT({}).setProtectedHeader({ alg: "ES256" }).setSubject("did:privy:demo")
    .setIssuer("privy.io").setAudience("banda-app").setIssuedAt().setExpirationTime("1h").sign(otherPair.privateKey);
  await assert.rejects(verify(`Bearer ${forged}`), { code: "UNAUTHORIZED" });
});

test("authenticated endpoint executes the lifecycle and redacts unexpected transport errors", async () => {
  const f = fixture();
  const handler = createHandler({ origin: "https://banda.test", authenticate: verify, limit: createLimiter(), enabled: true,
    prepare: createCoordinator(id => prepareQuote(id, f.chain, f.journal)) });
  const bearer = await token();
  const request = (body, origin = "https://banda.test", auth = `Bearer ${bearer}`) => new Request("https://banda.test/api/nav/prepare", {
    method: "POST", headers: { origin, authorization: auth, "content-type": "application/json" }, body,
  });
  const preflight = origin => handler(new Request("https://banda.test/api/nav/prepare", { method: "OPTIONS", headers: { origin } }));
  const allowedPreflight = await preflight("https://banda.test");
  assert.equal(allowedPreflight.status, 204);
  assert.equal(allowedPreflight.headers.get("access-control-allow-origin"), "https://banda.test");
  assert.match(allowedPreflight.headers.get("access-control-allow-headers"), /authorization/);
  const deniedPreflight = await preflight("https://evil.test");
  assert.equal(deniedPreflight.status, 403);
  assert.equal(deniedPreflight.headers.get("access-control-allow-origin"), null);
  const evil = await handler(request('{"strategyId":1}', "https://evil.test"));
  assert.equal(evil.status, 403);
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
  const unauthorized = await handler(request('{"strategyId":1}', "https://banda.test", "Bearer invalid"));
  assert.equal(unauthorized.headers.get("access-control-allow-origin"), "https://banda.test");
  assert.equal((await handler(request('{"strategyId":1}', "https://banda.test", "Bearer invalid"))).status, 401);
  assert.equal((await handler(request('{"strategyId":1,"price":1}'))).status, 400);
  assert.equal((await handler(request(" ".repeat(257)))).status, 413);
  assert.equal(f.events.length, 0);
  const response = await handler(request('{"strategyId":1}'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://banda.test");
  assert.equal((await response.json()).status, "refreshed");
  f.chain.chainId = async () => { throw Error("https://private.rpc/credential"); };
  const failed = await handler(request('{"strategyId":1}'));
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /credential|private.rpc/);
});
