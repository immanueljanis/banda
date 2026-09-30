import test from "node:test";
import assert from "node:assert/strict";
import { ContractFunctionExecutionError, ContractFunctionRevertedError, UserRejectedRequestError, parseAbi } from "viem";
import { CANCELLED, friendlyError } from "../../lib/friendly-error.ts";

const abi = parseAbi(["function approve(address spender, uint256 amount)"]);
const wrapped = (cause) => new ContractFunctionExecutionError(cause, {
  abi, functionName: "approve", args: ["0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7", 10000000n],
  contractAddress: "0xB42Df4e64356cAFbAEB63f572Ec95CC3BAE75dba", sender: "0x3CFcB94fb9Dd45EA6083298f7Ebf12f228A07e90",
});

test("wallet rejection becomes a short cancellation without calldata", () => {
  const error = wrapped(new UserRejectedRequestError(new Error("User rejected the request.")));
  assert.match(error.message, /Contract Call[\s\S]*0x3CFc/);
  assert.equal(friendlyError(error), CANCELLED);
  assert.equal(friendlyError(new Error("MetaMask Tx Signature: User denied transaction signature.")), CANCELLED);
});

test("contract reverts map to actionable sentences", () => {
  const revert = (reason) => wrapped(new ContractFunctionRevertedError({ abi, functionName: "approve", message: reason }));
  assert.match(friendlyError(revert("Banda: stale NAV")), /price quote expired/);
  assert.match(friendlyError(revert("ERC20: balance")), /Not enough USDG.*Paxos faucet/);
  assert.match(friendlyError(revert("Pool: inventory exhausted")), /out of inventory/);
  assert.match(friendlyError(revert("Banda: minimum payout")), /0\.5%/);
});

test("unknown technical errors never leak hex or long dumps", () => {
  const fallback = "Something went wrong. Nothing was sent; please try again.";
  assert.equal(friendlyError(new Error(`execution reverted 0x${"ab".repeat(40)}`)), fallback);
  assert.equal(friendlyError(new Error("line one\nline two")), fallback);
  assert.equal(friendlyError({ weird: true }), fallback);
  assert.match(friendlyError(new TypeError("Failed to fetch")), /Could not reach Banda/);
});

test("plain messages written for people pass through unchanged", () => {
  assert.equal(friendlyError(new Error("Minimum deposit is 10 USDG for this strategy.")), "Minimum deposit is 10 USDG for this strategy.");
});
