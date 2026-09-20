import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNav, validateFeed } from './nav.mjs';

const feed = (answer, decimals = 8) => ({ answer, decimals, roundId: 3n, answeredInRound: 3n, updatedAt: 990, maxAgeSeconds: 60, paused: false, blockNumber: 42n });
const direct = (key, asset, amount, decimals = 6) => ({ economicPositionKey: key, asset, amount, decimals, kind: 'direct', blockNumber: 42n });
const fixture = () => ({ blockNumber: 42n, timestamp: 1000, settlementAsset: 'USDG', settlementDecimals: 6, usdDecimals: 8, sequencerRequired: false, feeds: new Map([['USDG', feed(100_000_000n)], ['WETH', feed(200_000_000_000n)]]), positions: [direct('cash', 'USDG', 100_000_000n), direct('eth', 'WETH', 500_000_000_000_000_000n, 18)] });

test('standalone feed validator rejects malformed snapshot instead of bypassing freshness', () => {
  for (const timestamp of [NaN, Infinity, undefined, -1, 1000.5]) {
    assert.throws(() => validateFeed(feed(100_000_000n), { blockNumber: 42n, timestamp }), /snapshot timestamp/);
  }
  for (const blockNumber of [42, -1n, undefined]) {
    assert.throws(() => validateFeed(feed(100_000_000n), { blockNumber, timestamp: 1000 }), /block number/);
  }
});

test('different token/feed decimals: 100 USDG + 0.5 WETH at $2000 = 1100', () => {
  const input = fixture();
  input.feeds.set('WETH', feed(2000_000_000_000_000_000_000n, 18));
  const nav = calculateNav(input);
  assert.equal(nav.navSettlementUnits, 1_100_000_000n);
  assert.equal(nav.navUsdUnits, 110_000_000_000n);
  assert.equal(nav.valuationType, 'nav-not-executable-exit-quote');
});

test('USDG at $0.80: $1080 portfolio = 1350 USDG; cash stays 100 USDG', () => {
  const input = fixture();
  input.feeds.set('USDG', feed(80_000_000n));
  const nav = calculateNav(input);
  assert.equal(nav.navSettlementUnits, 1_350_000_000n);
  assert.equal(nav.navUsdUnits, 108_000_000_000n);
  input.positions = [input.positions[0]];
  assert.equal(calculateNav(input).navSettlementUnits, 100_000_000n);
});

test('vault uses supplied converted underlying, not receipt balance', () => {
  const input = fixture();
  input.positions = [{ economicPositionKey: 'vault-1', asset: 'WETH', decimals: 18, blockNumber: 42n, kind: 'vault-underlying', convertedAssets: 600_000_000_000_000_000n }];
  assert.equal(calculateNav(input).navSettlementUnits, 1_200_000_000n);
  input.positions.push(direct('vault-1', 'WETH', 600_000_000_000_000_000n, 18));
  assert.throws(() => calculateNav(input), /duplicate/);
});

test('floor only aggregate: two $0.0000006 positions produce one USDG base unit', () => {
  const input = fixture();
  input.feeds.set('DUST', feed(60n));
  input.positions = [direct('a', 'DUST', 1n, 0), direct('b', 'DUST', 1n, 0)];
  const nav = calculateNav(input);
  assert.equal(nav.navSettlementUnits, 1n);
  assert.equal(nav.navUsdUnits, 120n);
  assert.deepEqual(nav.exactSettlement, { numerator: 3n, denominator: 2_500_000n });
});

test('empty basket has zero NAV and validates settlement oracle', () => {
  const input = fixture(); input.positions = [];
  assert.equal(calculateNav(input).navSettlementUnits, 0n);
  input.feeds.delete('USDG');
  assert.throws(() => calculateNav(input), /Missing feed/);
});

for (const [name, update] of [
  ['stale', { updatedAt: 939 }],
  ['future', { updatedAt: 1001 }],
  ['zero answer', { answer: 0n }],
  ['negative answer', { answer: -1n }],
  ['incomplete round', { answeredInRound: 2n }],
  ['zero round', { roundId: 0n }],
  ['paused', { paused: true }],
  ['unknown pause state', { paused: undefined }],
  ['mixed block', { blockNumber: 43n }],
  ['absent timestamp', { updatedAt: 0 }],
]) test(`reject ${name} oracle`, () => {
  const input = fixture(); Object.assign(input.feeds.get('WETH'), update);
  assert.throws(() => calculateNav(input));
});

test('freshness boundary is accepted', () => {
  const input = fixture(); input.feeds.get('WETH').updatedAt = 940;
  assert.equal(calculateNav(input).navSettlementUnits, 1_100_000_000n);
});

for (const [name, mutate] of [
  ['mixed block holdings', p => { p.blockNumber = 41n; }],
  ['floating money', p => { p.amount = 1.5; }],
  ['negative amount', p => { p.amount = -1n; }],
  ['fractional decimals', p => { p.decimals = 1.5; }],
  ['wrong settlement decimals', p => { p.decimals = 18; }],
  ['receipt representation', p => { p.kind = 'receipt'; }],
  ['ambiguous representation', p => { p.convertedAssets = 1n; }],
]) test(`reject ${name}`, () => {
  const input = fixture(); mutate(input.positions[0]);
  assert.throws(() => calculateNav(input));
});

test('sequencer down, unknown, restart grace and mixed block fail closed', () => {
  const input = fixture(); input.sequencerRequired = true;
  assert.throws(() => calculateNav(input), /Sequencer/);
  input.sequencer = { blockNumber: 42n, answer: 0n, startedAt: 800, gracePeriodSeconds: 100 };
  assert.equal(calculateNav(input).navSettlementUnits, 1_100_000_000n);
  for (const change of [{ answer: 1n }, { startedAt: 900 }, { startedAt: 1001 }, { startedAt: 0 }, { blockNumber: 43n }]) {
    const variant = { ...input, sequencer: { ...input.sequencer, ...change } };
    assert.throws(() => calculateNav(variant), /Sequencer/);
  }
});

test('large balances preserve integer precision beyond Number safe range', () => {
  const input = fixture();
  const amount = 90_071_992_547_409_931n;
  input.positions = [direct('large', 'USDG', amount)];
  assert.equal(calculateNav(input).navSettlementUnits, amount);
});
