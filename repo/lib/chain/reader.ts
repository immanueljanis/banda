import {
  createPublicClient,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { ROBINHOOD_TESTNET, STRATEGY_IDS } from "./config";

const diamondAbi = [
  { type: "function", name: "isPaused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "settlementAsset", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "navGuard", stateMutability: "view", inputs: [], outputs: [{ type: "address" }, { type: "uint48" }] },
  { type: "function", name: "navBlockLag", stateMutability: "view", inputs: [], outputs: [{ type: "uint48" }] },
  {
    type: "function", name: "strategy", stateMutability: "view",
    inputs: [{ name: "strategyId", type: "uint32" }],
    outputs: [
      { name: "assetStrategy", type: "address" }, { name: "minimumDeposit", type: "uint96" },
      { name: "annualFeeBps", type: "uint16" }, { name: "feeRecipient", type: "address" },
      { name: "enabled", type: "bool" },
    ],
  },
] as const;

export type LiveChainSnapshot = {
  chainId: number;
  blockNumber: string;
  paused: boolean;
  settlementAsset: Address;
  navAdapter: Address;
  navMaxAgeSeconds: number;
  navMaxBlockLag: number;
  strategies: Array<{ id: number; strategy: Address; minimumDeposit: string; annualFeeBps: number; enabled: boolean }>;
  source: "robinhood-rpc";
  fetchedAt: string;
};

const call = (functionName: string, args?: readonly unknown[]) => ({
  address: ROBINHOOD_TESTNET.diamond,
  abi: diamondAbi,
  functionName,
  ...(args ? { args } : {}),
});

let cached: { expiresAt: number; value: LiveChainSnapshot } | undefined;
let inFlight: Promise<LiveChainSnapshot> | undefined;

function client(): PublicClient {
  const rpcUrl = process.env.ROBINHOOD_TESTNET_RPC_URL;
  if (!rpcUrl) throw new Error("ROBINHOOD_TESTNET_RPC_URL is not configured");
  return createPublicClient({
    chain: ROBINHOOD_TESTNET,
    transport: http(rpcUrl, { timeout: 8_000, retryCount: 1, retryDelay: 250 }),
  });
}

async function readSnapshot(): Promise<LiveChainSnapshot> {
  const rpc = client();
  const [blockNumber, state] = await Promise.all([
    rpc.getBlockNumber(),
    rpc.multicall({
      allowFailure: false,
      contracts: [
        call("isPaused"),
        call("settlementAsset"),
        call("navGuard"),
        call("navBlockLag"),
        ...STRATEGY_IDS.map((strategyId) => call("strategy", [strategyId])),
      ],
    }),
  ]);
  const [paused, settlementAsset, navGuard, navBlockLag, ...strategies] = state;
  const [navAdapter, maxAge] = navGuard as unknown as readonly [Address, bigint];
  return {
    chainId: ROBINHOOD_TESTNET.id,
    blockNumber: blockNumber.toString(),
    paused: paused as boolean,
    settlementAsset: settlementAsset as Address,
    navAdapter,
    navMaxAgeSeconds: Number(maxAge),
    navMaxBlockLag: Number(navBlockLag as unknown as bigint),
    strategies: strategies.map((entry, index) => {
      const [strategy, minimumDeposit, annualFeeBps, , enabled] = entry as unknown as readonly [Address, bigint, bigint, Address, boolean];
      return { id: STRATEGY_IDS[index], strategy, minimumDeposit: minimumDeposit.toString(), annualFeeBps: Number(annualFeeBps), enabled };
    }),
    source: "robinhood-rpc",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getLiveChainSnapshot(): Promise<LiveChainSnapshot> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  if (!inFlight) {
    inFlight = readSnapshot().then((value) => {
      cached = { value, expiresAt: Date.now() + 10_000 };
      return value;
    }).finally(() => { inFlight = undefined; });
  }
  return inFlight;
}
