/** Offline NAV arithmetic. Inputs MUST come from independently verified same-block
 * adapters. This module neither reads contracts nor proves oracle/token identity.
 * All monetary integers are bigint; timestamps/decimals are safe integer numbers.
 * Rounding: aggregate exact rational values, floor once per output currency.
 */
const fail = (message) => { throw new Error(message); };
const integer = (n, label) => Number.isSafeInteger(n) && n >= 0 || fail(`Invalid ${label}`);
const units = (decimals) => {
  integer(decimals, 'decimals');
  if (decimals > 255) fail('Invalid decimals');
  return 10n ** BigInt(decimals);
};
const nonnegative = (n, label) => typeof n === 'bigint' && n >= 0n || fail(`Invalid ${label}`);
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const fraction = (n, d) => { const g = gcd(n, d); return { numerator: n / g, denominator: d / g }; };
const add = (a, b) => fraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);

export function validateFeed(feed, { blockNumber, timestamp }) {
  nonnegative(blockNumber, 'block number');
  integer(timestamp, 'snapshot timestamp');
  if (!feed || feed.blockNumber !== blockNumber) fail('Missing feed or mixed block snapshot');
  units(feed.decimals);
  if (typeof feed.answer !== 'bigint' || feed.answer <= 0n) fail('Nonpositive or invalid feed answer');
  if (typeof feed.roundId !== 'bigint' || feed.roundId <= 0n || typeof feed.answeredInRound !== 'bigint' || feed.answeredInRound < feed.roundId) fail('Incomplete feed round');
  integer(feed.updatedAt, 'feed timestamp');
  integer(feed.maxAgeSeconds, 'feed max age');
  if (feed.updatedAt === 0 || feed.updatedAt > timestamp || timestamp - feed.updatedAt > feed.maxAgeSeconds) fail('Stale or future feed');
  if (feed.paused !== false) fail('Feed pause state not verified');
  return fraction(feed.answer, units(feed.decimals));
}

/** positions: { economicPositionKey, asset, decimals, blockNumber,
 * kind: 'direct', amount } OR kind: 'vault-underlying', convertedAssets.
 * convertedAssets is the actual same-block convertToAssets(shareBalance) result,
 * already denominated in underlying token base units (not receipt units).
 * Different independently owned balances may share an asset but never a key.
 * feeds: Map of asset identifiers to validated USD feed snapshots.
 * sequencerRequired must explicitly declare the chain-specific requirement.
 */
export function calculateNav({ blockNumber, timestamp, settlementAsset, settlementDecimals, usdDecimals = 8, positions, feeds, sequencerRequired, sequencer }) {
  nonnegative(blockNumber, 'block number');
  integer(timestamp, 'snapshot timestamp');
  units(settlementDecimals); units(usdDecimals);
  if (typeof sequencerRequired !== 'boolean') fail('Sequencer requirement must be explicit');
  if (sequencerRequired) {
    if (!sequencer || sequencer.blockNumber !== blockNumber || sequencer.answer !== 0n) fail('Sequencer unavailable or down');
    integer(sequencer.startedAt, 'sequencer startedAt');
    integer(sequencer.gracePeriodSeconds, 'sequencer grace');
    if (sequencer.startedAt === 0 || sequencer.startedAt > timestamp || timestamp - sequencer.startedAt <= sequencer.gracePeriodSeconds) fail('Sequencer grace period');
  }
  if (!(feeds instanceof Map) || !Array.isArray(positions)) fail('Invalid positions or feeds');
  const snapshot = { blockNumber, timestamp };
  const settlementPrice = validateFeed(feeds.get(settlementAsset), snapshot);
  let usd = fraction(0n, 1n);
  const seen = new Set();
  const assetDecimals = new Map([[settlementAsset, settlementDecimals]]);
  for (const position of positions) {
    const { economicPositionKey: key, asset, decimals, kind } = position;
    if (typeof key !== 'string' || !key.trim() || seen.has(key)) fail('Missing or duplicate economic position key');
    seen.add(key);
    if (position.blockNumber !== blockNumber) fail('Mixed block position snapshot');
    if (assetDecimals.has(asset) && assetDecimals.get(asset) !== decimals) fail('Inconsistent asset decimals');
    assetDecimals.set(asset, decimals);
    const scale = units(decimals);
    let amount;
    if (kind === 'direct') {
      if ('convertedAssets' in position) fail('Ambiguous direct position');
      amount = position.amount;
    } else if (kind === 'vault-underlying') {
      if ('amount' in position) fail('Do not count receipt amount alongside underlying');
      amount = position.convertedAssets;
    } else fail('Unsupported representation: use direct or converted vault underlying');
    nonnegative(amount, 'position amount');
    const price = validateFeed(feeds.get(asset), snapshot);
    usd = add(usd, fraction(amount * price.numerator, scale * price.denominator));
  }
  const settlement = fraction(usd.numerator * settlementPrice.denominator, usd.denominator * settlementPrice.numerator);
  return {
    blockNumber,
    timestamp,
    settlementAsset,
    settlementDecimals,
    navSettlementUnits: settlement.numerator * units(settlementDecimals) / settlement.denominator,
    usdDecimals,
    navUsdUnits: usd.numerator * units(usdDecimals) / usd.denominator,
    exactSettlement: settlement,
    exactUsd: usd,
    rounding: 'floor-once-after-aggregation',
    valuationType: 'nav-not-executable-exit-quote',
  };
}
