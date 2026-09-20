// Read-only BND-002 evidence. Never signs, sends transactions, or supplies a
// replacement sequencer policy. No private keys or API keys are needed.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { calculateNav, validateFeed } from './nav.mjs';

const rpcUrl = process.env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const catalogUrl = 'https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json';
const catalogPage = 'https://docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood';
const evidenceDir = new URL('./evidence/', import.meta.url);
const output = new URL('bnd002-oracles.json', evidenceDir);
const report = {
  checkedAt: new Date().toISOString(), task: 'BND-002', status: 'blocked',
  sources: [catalogPage, catalogUrl, 'https://docs.chain.link/data-feeds/l2-sequencer-feeds'],
  note: 'Read-only feed evidence; no deployed Banda portfolio or executable NAV/exit quote.',
};
let id = 0;
async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${method}: HTTP ${response.status}`);
  const body = await response.json();
  if (body.error || body.result === undefined) throw new Error(`${method}: RPC error ${body.error?.code ?? 'missing result'}`);
  return body.result;
}
function words(data, count) {
  if (!new RegExp(`^0x[0-9a-fA-F]{${count * 64}}$`).test(data)) throw new Error('Invalid ABI result');
  return data.slice(2).match(/.{64}/g).map(x => BigInt(`0x${x}`));
}
function decodeString(data) {
  if (!/^0x[0-9a-fA-F]+$/.test(data) || data.length < 130) throw new Error('Invalid ABI string');
  const offset = Number(BigInt(`0x${data.slice(2, 66)}`)) * 2 + 2;
  if (offset !== 66) throw new Error('Unexpected ABI string offset');
  const length = Number(BigInt(`0x${data.slice(offset, offset + 64)}`));
  if (length > 256 || data.length < offset + 64 + length * 2) throw new Error('Invalid ABI string length');
  return Buffer.from(data.slice(offset + 64, offset + 64 + length * 2), 'hex').toString('utf8');
}
try {
  const chainId = BigInt(await rpc('eth_chainId', []));
  if (chainId !== 4663n) throw new Error('Wrong chain: expected Robinhood mainnet 4663');
  const tag = process.env.BND_BLOCK || await rpc('eth_blockNumber', []);
  if (!/^0x[0-9a-fA-F]+$/.test(tag)) throw new Error('BND_BLOCK must be a hex block number');
  const block = await rpc('eth_getBlockByNumber', [tag, false]);
  if (!block || block.number !== tag) throw new Error('Missing/mismatched snapshot block');
  const blockNumber = BigInt(tag), timestamp = Number(BigInt(block.timestamp));
  report.snapshot = { chainId, blockNumber, hash: block.hash, timestamp };
  const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
  const raw = await response.text();
  const catalog = JSON.parse(raw);
  report.catalogSha256 = createHash('sha256').update(raw).digest('hex');
  if (!Array.isArray(catalog)) throw new Error('Unknown feed catalog schema');
  const feeds = new Map();
  report.feeds = [];
  for (const asset of ['ETH', 'USDG']) {
    const candidates = catalog.filter(x => x.name === `${asset} / USD` && x.docs?.blockchainName === 'Robinhood');
    if (candidates.length !== 1) throw new Error(`Missing/ambiguous ${asset} feed identity`);
    const entry = candidates[0];
    if (!/^0x[0-9a-fA-F]{40}$/.test(entry.proxyAddress)) throw new Error('Invalid feed proxy');
    const call = data => rpc('eth_call', [{ to: entry.proxyAddress, data }, tag]);
    const [code, decimalsRaw, roundRaw, descriptionRaw] = await Promise.all([
      rpc('eth_getCode', [entry.proxyAddress, tag]), call('0x313ce567'), call('0xfeaf968c'), call('0x7284e416'),
    ]);
    if (code === '0x') throw new Error('Feed proxy has no code');
    const decimals = Number(words(decimalsRaw, 1)[0]);
    const [roundId, unsignedAnswer, startedAt, updatedAt, answeredInRound] = words(roundRaw, 5);
    const answer = BigInt.asIntN(256, unsignedAnswer);
    const description = decodeString(descriptionRaw);
    if (decimals !== entry.decimals || description !== entry.name) throw new Error(`Feed metadata mismatch: ${asset}`);
    // Corporate-action oraclePaused applies to stock tokens, not these ETH/USDG
    // feeds. This does not waive USDG token pause/freeze checks before execution.
    const feed = { blockNumber, decimals, roundId, answer, updatedAt: Number(updatedAt), answeredInRound, maxAgeSeconds: entry.heartbeat, paused: false };
    const price = validateFeed(feed, { blockNumber, timestamp });
    feeds.set(asset, feed);
    report.feeds.push({ asset, proxy: entry.proxyAddress, description, heartbeat: entry.heartbeat, ageSeconds: timestamp - Number(updatedAt), startedAt, ...feed, price, codeSha256: createHash('sha256').update(code).digest('hex'), pauseApplicability: 'stock corporate-action pause not applicable; token execution restrictions separate' });
  }
  const confirmedBlock = await rpc('eth_getBlockByNumber', [tag, false]);
  if (confirmedBlock?.hash !== block.hash) throw new Error('Snapshot reorg detected; retry probe');
  report.feedChecks = 'passed';
  report.sequencer = { status: 'unverified', source: report.sources[2], reason: 'Robinhood is not listed in the official supported uptime-feed networks checked on 2026-09-15; page states no expansion to additional networks. No alternative policy has been approved.' };
  // Prove the integration stays closed even with two otherwise valid feeds.
  try {
    calculateNav({ blockNumber, timestamp, settlementAsset: 'USDG', settlementDecimals: 6, positions: [], feeds, sequencerRequired: true });
    throw new Error('Unexpected NAV acceptance without sequencer validation');
  } catch (error) {
    if (error.message !== 'Sequencer unavailable or down') throw error;
    report.guardCheck = 'passed: NAV rejected missing sequencer evidence';
  }
  report.status = 'partial: live feeds verified; sequencer policy unresolved';
} catch (error) {
  // RPC/provider errors intentionally omit URLs because custom URLs can contain keys.
  report.error = error.message.includes(rpcUrl) ? 'RPC request failed' : error.message;
  process.exitCode = 1;
} finally {
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(output, JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n');
  console.log(JSON.stringify({ task: report.task, status: report.status, feedChecks: report.feedChecks, guardCheck: report.guardCheck, error: report.error }));
}
