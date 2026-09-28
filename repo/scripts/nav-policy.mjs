export function metadata(header) {
  if (!header?.l1BlockNumber || !header?.timestamp) throw new Error("Missing parent block metadata");
  return { block: BigInt(header.l1BlockNumber), time: BigInt(header.timestamp) };
}

export function shouldRefresh(quote, head, maxAge, maxLag) {
  const [price, time, block, valid] = quote;
  if (price <= 0n || !valid) throw new Error("Refusing to renew an invalid or uninitialized quote");
  if (time > head.time || block > head.block) throw new Error("Future quote or inconsistent RPC");
  if (maxAge <= 0n || maxLag <= 0n) throw new Error("Invalid NAV policy");
  // Renew halfway through either validity window, leaving time for confirmations.
  return head.time - time >= (maxAge + 1n) / 2n ||
    head.block - block >= (maxLag + 1n) / 2n;
}
