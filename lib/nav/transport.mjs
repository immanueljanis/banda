import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ADAPTER, DIAMOND } from "./prepare.mjs";

const abi = parseAbi([
  "function navGuard() view returns (address,uint48)",
  "function navBlockLag() view returns (uint48)",
  "function strategy(uint32) view returns (address,uint96,uint16,address,bool)",
  "function updater() view returns (address)",
  "function owner() view returns (address)",
  "function quotes(address) view returns (uint256,uint256,uint256,bool)",
  "function setQuote(address,uint256,uint256,uint256,bool)",
  "function settlementAsset() view returns (address)",
  "function pool() view returns (address)",
  "function legs() view returns (address[],uint16[])",
  "function updater() view returns (address)",
  "function maxAge() view returns (uint64)",
  "function maxDeviationBps() view returns (uint16)",
  "function listings(address) view returns (uint128,uint64,uint64,bool,bool)",
  "function symbol() view returns (string)",
  "function setPrices(address[],uint128[])",
]);

export function createTransport(rpc, key) {
  const chain = { id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } };
  const account = privateKeyToAccount(key);
  const client = createPublicClient({ chain, transport: http(rpc, { retryCount: 1, timeout: 10_000 }) });
  const wallet = createWalletClient({ account, chain, transport: http(rpc, { retryCount: 0, timeout: 15_000 }) });
  let updateArgs;
  let pricePool;
  return {
    signer: account.address,
    chainId: () => client.getChainId(),
    async snapshot(strategyId) {
      const header = await client.request({ method: "eth_getBlockByNumber", params: ["latest", false] });
      const read = (address, functionName, args) => client.readContract({ address, abi, functionName, args, blockNumber: BigInt(header.number) });
      const [[adapter, age], lag, operator, owner, [strategy, , , , enabled]] = await Promise.all([
        read(DIAMOND, "navGuard"), read(DIAMOND, "navBlockLag"),
        read(ADAPTER, "updater"), read(ADAPTER, "owner"), read(DIAMOND, "strategy", [strategyId]),
      ]);
      const quote = await read(ADAPTER, "quotes", [strategy]);
      return { adapter, age, lag, operator, owner, strategy, enabled, quote, header };
    },
    async simulate(args) {
      updateArgs = args;
      await client.simulateContract({ address: ADAPTER, abi, functionName: "setQuote", args, account });
    },
    async fees() {
      const [gas, gasPrice, balance, pending, mined] = await Promise.all([
        client.estimateContractGas({ address: ADAPTER, abi, functionName: "setQuote", args: updateArgs, account }),
        client.getGasPrice(), client.getBalance({ address: account.address }),
        client.getTransactionCount({ address: account.address, blockTag: "pending" }),
        client.getTransactionCount({ address: account.address, blockTag: "latest" }),
      ]);
      return { gas, gasPrice, balance, pending, mined };
    },
    async priceSnapshot(strategyId) {
      const header = await client.request({ method: "eth_getBlockByNumber", params: ["latest", false] });
      const read = (address, functionName, args) => client.readContract({ address, abi, functionName, args, blockNumber: BigInt(header.number) });
      const [[strategy], settlement] = await Promise.all([read(DIAMOND, "strategy", [strategyId]), read(DIAMOND, "settlementAsset")]);
      const pool = await read(strategy, "pool").catch(() => null);
      if (!pool) return null;
      const updater = await read(pool, "updater").catch(() => null);
      if (!updater) return null;
      const [maxAge, maxDeviationBps, [tokens]] = await Promise.all([read(pool, "maxAge"), read(pool, "maxDeviationBps"), read(strategy, "legs")]);
      const priced = tokens.filter(token => token.toLowerCase() !== settlement.toLowerCase());
      const legs = await Promise.all(priced.map(async token => {
        const [symbol, [price, updatedAt]] = await Promise.all([read(token, "symbol"), read(pool, "listings", [token])]);
        return { token, symbol: symbol === "WETH" ? "ETH" : symbol, price, updatedAt: BigInt(updatedAt) };
      }));
      pricePool = pool;
      return { pool, updater, maxAge: BigInt(maxAge), maxDeviationBps: BigInt(maxDeviationBps), now: BigInt(header.timestamp), legs };
    },
    async simulatePrices(args) {
      await client.simulateContract({ address: pricePool, abi, functionName: "setPrices", args, account });
    },
    async pricesFees(args) {
      const [gas, gasPrice, balance, pending, mined] = await Promise.all([
        client.estimateContractGas({ address: pricePool, abi, functionName: "setPrices", args, account }),
        client.getGasPrice(), client.getBalance({ address: account.address }),
        client.getTransactionCount({ address: account.address, blockTag: "pending" }),
        client.getTransactionCount({ address: account.address, blockTag: "latest" }),
      ]);
      return { gas, gasPrice, balance, pending, mined };
    },
    sendPrices: (args, fees) => wallet.writeContract({ address: pricePool, abi, functionName: "setPrices", args, ...fees, type: "legacy" }),
    send: (args, fees) => wallet.writeContract({ address: ADAPTER, abi, functionName: "setQuote", args, ...fees, type: "legacy" }),
    receipt: hash => client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 90_000, pollingInterval: 400 }),
  };
}
