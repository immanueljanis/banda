import {
  getAddress,
  hexToBigInt,
  keccak256,
  numberToHex,
  toBytes,
  type Address,
  type PublicClient,
} from "viem";
import { ROBINHOOD_TESTNET } from "./config";
import { getPublicClient } from "./reader";

/** Diamond storage slot of `nextTokenId` (LibBandaStorage base slot + 4), read directly so no event scan is needed. */
const NEXT_TOKEN_ID_SLOT = numberToHex(hexToBigInt(keccak256(toBytes("banda.managed-baskets.storage.v1"))) + BigInt(4), { size: 32 });
const INDEXER_CACHE_MS = 5_000;

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

/**
 * Reads every live Basket owner at one block: the minted count from Diamond storage, then one multicall
 * of ownerOf. Burned Baskets fail ownerOf and are skipped. Constant cost, unlike scanning Transfer logs.
 */
async function readOwnership(rpc: PublicClient): Promise<CachedOwnership> {
  const blockNumber = await rpc.getBlockNumber();
  const raw = await rpc.getStorageAt({ address: ROBINHOOD_TESTNET.diamond, slot: NEXT_TOKEN_ID_SLOT, blockNumber });
  const minted = raw ? hexToBigInt(raw) : BigInt(0);
  const tokenIds = Array.from({ length: Number(minted) }, (_, index) => BigInt(index + 1));
  const owners = await rpc.multicall({
    contracts: tokenIds.map((tokenId) => ({ address: ROBINHOOD_TESTNET.diamond, abi: nftAbi, functionName: "ownerOf" as const, args: [tokenId] })),
    allowFailure: true,
    blockNumber,
  });
  const ownership: Ownership = new Map();
  owners.forEach((owner, index) => { if (owner.status === "success") ownership.set(tokenIds[index], getAddress(owner.result as Address)); });
  return { expiresAt: Date.now() + INDEXER_CACHE_MS, blockNumber, ownership };
}

async function ownershipSnapshot(rpc: PublicClient): Promise<CachedOwnership> {
  if (cachedOwnership && cachedOwnership.expiresAt > Date.now()) return cachedOwnership;
  if (!ownershipInFlight) {
    ownershipInFlight = readOwnership(rpc).then((value) => { cachedOwnership = value; return value; }).finally(() => { ownershipInFlight = undefined; });
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
  source: "robinhood-rpc-state";
  fetchedAt: string;
};

export async function getLivePortfolio(address: Address): Promise<LivePortfolio> {
  const rpc = getPublicClient();
  const [indexed, settlementBalance] = await Promise.all([
    ownershipSnapshot(rpc),
    rpc.readContract({ address: ROBINHOOD_TESTNET.settlementAsset, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
  ]);
  const tokenIds = [...indexed.ownership.entries()].filter(([, owner]) => owner.toLowerCase() === address.toLowerCase()).map(([tokenId]) => tokenId);
  const rows = await Promise.all(tokenIds.map(async (tokenId) => {
    const [owner, basket] = await Promise.allSettled([
      rpc.readContract({ address: ROBINHOOD_TESTNET.diamond, abi: nftAbi, functionName: "ownerOf", args: [tokenId] }),
      rpc.readContract({ address: ROBINHOOD_TESTNET.diamond, abi: nftAbi, functionName: "basket", args: [tokenId] }),
    ]);
    return { owner, basket };
  }));
  const positions: PortfolioPosition[] = [];
  for (let i = 0; i < tokenIds.length; i += 1) {
    const { owner, basket } = rows[i];
    if (owner.status !== "fulfilled" || basket.status !== "fulfilled") continue;
    const [strategyId, account, shares] = basket.value as readonly [number, Address, bigint];
    if ((owner.value as Address).toLowerCase() !== address.toLowerCase()) continue;
    positions.push({ tokenId: tokenIds[i].toString(), strategyId, account, shares: shares.toString() });
  }
  return { address, blockNumber: indexed.blockNumber.toString(), settlementBalance: settlementBalance.toString(), positions, source: "robinhood-rpc-state", fetchedAt: new Date().toISOString() };
}
