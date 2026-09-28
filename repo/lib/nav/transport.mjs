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
]);

export function createTransport(rpc, key) {
  const chain = { id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } };
  const account = privateKeyToAccount(key);
  const client = createPublicClient({ chain, transport: http(rpc, { retryCount: 1, timeout: 10_000 }) });
  const wallet = createWalletClient({ account, chain, transport: http(rpc, { retryCount: 0, timeout: 15_000 }) });
  let updateArgs;
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
    send: (args, fees) => wallet.writeContract({ address: ADAPTER, abi, functionName: "setQuote", args, ...fees, type: "legacy" }),
    receipt: hash => client.waitForTransactionReceipt({ hash, confirmations: 2, timeout: 90_000, pollingInterval: 2_000 }),
  };
}
