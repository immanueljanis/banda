import test from "node:test";
import assert from "node:assert/strict";
import { metadata, shouldRefresh } from "../nav-policy.mjs";
test("parent block is used instead of RPC L2 number", () => {
  assert.deepEqual(metadata({number:"0x7782c46",l1BlockNumber:"0xb3fb5a",timestamp:"0x6ab96804"}), {block:11795290n,time:1790535684n});
  assert.throws(() => metadata({number:"0x7782c46",timestamp:"0x1"}));
});
test("either freshness threshold renews; healthy quotes skip", () => {
  const q = [10n,1000n,100n,true];
  assert.equal(shouldRefresh(q,{time:1100n,block:109n},900n,20n),false);
  assert.equal(shouldRefresh(q,{time:1450n,block:109n},900n,20n),true);
  assert.equal(shouldRefresh(q,{time:1100n,block:110n},900n,20n),true);
});
test("invalid, uninitialized, future quotes and invalid policy fail closed", () => {
  for (const q of [[0n,1n,1n,true],[1n,1n,1n,false],[1n,2000n,1n,true],[1n,1n,2000n,true]])
    assert.throws(() => shouldRefresh(q,{time:1000n,block:100n},900n,20n));
  assert.throws(() => shouldRefresh([1n,1n,1n,true],{time:2n,block:2n},900n,0n));
});
