import { createPublicClient, createWalletClient, http, parseAbi, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { open, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { metadata, shouldRefresh } from "./nav-policy.mjs";

const diamond = "0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7";
const expectedAdapter = "0x50EB95DB909e7870B48D24c01234e69a19066011";
const chain = { id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [] } } };
const abi = parseAbi([
  "function navGuard() view returns (address,uint48)",
  "function navBlockLag() view returns (uint48)",
  "function strategy(uint32) view returns (address,uint96,uint16,address,bool)",
  "function updater() view returns (address)",
  "function owner() view returns (address)",
  "function quotes(address) view returns (uint256,uint256,uint256,bool)",
  "function setQuote(address,uint256,uint256,uint256,bool)",
]);
const broadcast = process.argv.includes("--broadcast");
const once = process.argv.includes("--once");
if (broadcast && process.env.BANDA_NAV_ON_DEMAND === "true") {
  throw new Error("On-demand NAV is enabled. Do not run a second signer worker.");
}
const rpc = process.env.ROBINHOOD_TESTNET_RPC_URL;
if (!rpc) throw new Error("Set ROBINHOOD_TESTNET_RPC_URL");
const publicClient = createPublicClient({ chain, transport: http(rpc, {timeout: 15000, retryCount: 1}) });
const key = process.env.BANDA_OPERATOR_PRIVATE_KEY;
if (broadcast && !key) throw new Error("Broadcast requires server-only BANDA_OPERATOR_PRIVATE_KEY");
const account = broadcast ? privateKeyToAccount(key) : undefined;
const wallet = account ? createWalletClient({account, chain, transport: http(rpc, {retryCount: 0, timeout: 15000})}) : undefined;
const lockPath = join(tmpdir(), "banda-nav-46630.lock");
let lock;
let uncertain = false;
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });
const log = (event, details = {}) => console.log(JSON.stringify({at: new Date().toISOString(), event, ...details}));
const read = (address, functionName, args, blockNumber) => publicClient.readContract({address, abi, functionName, args, blockNumber});

async function cycle() {
  if (await publicClient.getChainId() !== 46630) throw new Error("Wrong chain");
  // Read policy afresh each cycle; an adapter upgrade requires explicit review.
  const [adapter, age] = await read(diamond, "navGuard");
  if (adapter.toLowerCase() !== expectedAdapter.toLowerCase()) throw new Error("Adapter changed; updater stopped");
  const lag = await read(diamond, "navBlockLag");
  const operator = await read(adapter, "updater");
  const owner = await read(adapter, "owner");
  if (account && (account.address.toLowerCase() !== operator.toLowerCase() || account.address.toLowerCase() === owner.toLowerCase())) throw new Error("Use the dedicated operator, never the admin");
  for (let id = 1; id <= 5 && !stopping; id++) {
    // Never use the L2 RPC number as observedBlock. Pin reads to this same header.
    const header = await publicClient.request({method: "eth_getBlockByNumber", params: ["latest", false]});
    const head = metadata(header);
    const l2Block = BigInt(header.number);
    const [strategy, , , , enabled] = await read(diamond, "strategy", [id], l2Block);
    if (!enabled) { log("disabled", {strategyId: id}); continue; }
    const quote = await read(adapter, "quotes", [strategy], l2Block);
    if (!shouldRefresh(quote, head, BigInt(age), BigInt(lag))) {
      log("fresh", {strategyId: id}); continue;
    }
    const args = [strategy, quote[0], head.time, head.block, true];
    await publicClient.simulateContract({address: adapter, abi, functionName: "setQuote", args, account: operator});
    if (!broadcast) { log("would_refresh_mock", {strategyId: id, parentBlock: head.block.toString()}); continue; }
    const balance = await publicClient.getBalance({address: account.address});
    const gas = await publicClient.estimateContractGas({address: adapter, abi, functionName: "setQuote", args, account});
    const gasPrice = await publicClient.getGasPrice();
    const gasLimit = gas * 130n / 100n;
    if (balance < gasLimit * gasPrice * 2n + parseEther("0.0001")) throw new Error("Operator gas reserve too low; fund operator before restart");
    const pending = await publicClient.getTransactionCount({address: account.address, blockTag: "pending"});
    const mined = await publicClient.getTransactionCount({address: account.address, blockTag: "latest"});
    if (pending !== mined) throw new Error("Operator has pending transactions; inspect before retrying");
    // A send timeout may still have broadcast. Preserve the lock on ambiguous outcomes.
    uncertain = true;
    const hash = await wallet.writeContract({address: adapter, abi, functionName: "setQuote", args, gas: gasLimit, nonce: pending});
    log("submitted", {strategyId: id, hash});
    await lock.writeFile(JSON.stringify({pid: process.pid, hash}) + "\n");
    const receipt = await publicClient.waitForTransactionReceipt({hash, confirmations: 2, timeout: 120000});
    uncertain = false;
    if (receipt.status !== "success") throw new Error("Quote update reverted");
    log("confirmed", {strategyId: id, hash});
  }
}

try {
  lock = await open(lockPath, "wx");
  await lock.writeFile(JSON.stringify({pid: process.pid}) + "\n");
  log("started", {mode: broadcast ? "broadcast_mock" : "dry_run", lockPath});
  do {
    await cycle();
    if (!once && !stopping) await sleep(30000);
  } while (!once && !stopping);
} catch {
  // Do not print transport errors: they can contain credentialed RPC URLs.
  log("stopped_with_error", {hint: "Check chain, quote validity, operator configuration, gas reserve and lock. RPC credentials are omitted.", lockPath, uncertain});
  process.exitCode = 1;
} finally {
  if (lock) {
    await lock.close();
    if (!uncertain) await unlink(lockPath);
    else log("pending_requires_review", {lockPath});
  }
}
