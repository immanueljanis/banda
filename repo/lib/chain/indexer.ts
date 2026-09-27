import {
  getAddress,
  parseAbiItem,
  type Address,
  type PublicClient,
} from "viem";
import { ROBINHOOD_TESTNET } from "./config";
import { getPublicClient } from "./reader";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);
const ZERO = "0x0000000000000000000000000000000000000000";
const PAGE_SIZE = BigInt(2_000);
const CONFIRMATION_DEPTH = BigInt(2);
const INDEXER_CACHE_MS = 15_000;

const nftAbi = [
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "basket", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint32" }, { type: "address" }, { type: "uint128" }] },
] as const;

const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

type Ownership = Map<bigint, Address>;
type CachedOwnership = { expiresAt: number; blockNumber: bigint; ownership: Ownership };
let cachedOwnership: CachedOwnership | undefined;
let ownershipInFlight: Promise<CachedOwnership> | undefined;

function startBlock(): bigint {
  const configured = process.env.ROBINHOOD_INDEXER_START_BLOCK;
  if (!configured) throw new Error("ROBINHOOD_INDEXER_START_BLOCK is not configured");
  const block = BigInt(configured);
  if (block < BigInt(0)) throw new Error("ROBINHOOD_INDEXER_START_BLOCK must be non-negative");
  return block;
}

async function scanOwnership(rpc: PublicClient): Promise<CachedOwnership> {
  const latest = await rpc.getBlockNumber();
  const toBlock = latest > CONFIRMATION_DEPTH ? latest - CONFIRMATION_DEPTH : latest;
  const fromBlock = startBlock();
  if (fromBlock > toBlock) return { expiresAt: Date.now() + INDEXER_CACHE_MS, blockNumber: toBlock, ownership: new Map() };

  const ownership: Ownership = new Map();
  for (let pageFrom = fromBlock; pageFrom <= toBlock; pageFrom += PAGE_SIZE) {
    const pageTo = pageFrom + PAGE_SIZE - BigInt(1) < toBlock ? pageFrom + PAGE_SIZE - BigInt(1) : toBlock;
    const logs = await rpc.getLogs({ address: ROBINHOOD_TESTNET.diamond, event: transferEvent, fromBlock: pageFrom, toBlock: pageTo });
    for (const log of logs) {
      const args = log.args;
      if (!args.tokenId || !args.to) continue;
      if (args.to.toLowerCase() === ZERO) ownership.delete(args.tokenId);
      else ownership.set(args.tokenId, getAddress(args.to));
    }
  }
  return { expiresAt: Date.now() + INDEXER_CACHE_MS, blockNumber: toBlock, ownership };
}

async function ownershipSnapshot(rpc: PublicClient): Promise<CachedOwnership> {
  if (cachedOwnership && cachedOwnership.expiresAt > Date.now()) return cachedOwnership;
  if (!ownershipInFlight) {
    ownershipInFlight = scanOwnership(rpc).then((value) => { cachedOwnership = value; return value; }).finally(() => { ownershipInFlight = undefined; });
  }
  return ownershipInFlight;
}

export type PortfolioPosition = {
  tokenId: string;
  strategyId: number;
  account: Address;
  shares: string;
};

export type LivePortfolio = {
  address: Address;
  blockNumber: string;
  settlementBalance: string;
  positions: PortfolioPosition[];
  source: "robinhood-rpc-events";
  fetchedAt: string;
};

export async function getLivePortfolio(address: Address): Promise<LivePortfolio> {
  const rpc = getPublicClient();
  const [indexed, settlementBalance] = await Promise.all([
    ownershipSnapshot(rpc),
    rpc.readContract({ address: ROBINHOOD_TESTNET.settlementAsset, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
  ]);
  const tokenIds = [...indexed.ownership.entries()].filter(([, owner]) => owner.toLowerCase() === address.toLowerCase()).map(([tokenId]) => tokenId);
  const rows = await rpc.multicall({ allowFailure: true, contracts: tokenIds.flatMap((tokenId) => [
    { address: ROBINHOOD_TESTNET.diamond, abi: nftAbi, functionName: "ownerOf", args: [tokenId] },
    { address: ROBINHOOD_TESTNET.diamond, abi: nftAbi, functionName: "basket", args: [tokenId] },
  ]) });
  const positions: PortfolioPosition[] = [];
  for (let i = 0; i < tokenIds.length; i += 1) {
    const owner = rows[i * 2];
    const basket = rows[i * 2 + 1];
    if (owner.status !== "success" || basket.status !== "success") continue;
    const [strategyId, account, shares] = basket.result as readonly [number, Address, bigint];
    if ((owner.result as Address).toLowerCase() !== address.toLowerCase()) continue;
    positions.push({ tokenId: tokenIds[i].toString(), strategyId, account, shares: shares.toString() });
  }
  return { address, blockNumber: indexed.blockNumber.toString(), settlementBalance: settlementBalance.toString(), positions, source: "robinhood-rpc-events", fetchedAt: new Date().toISOString() };
}
