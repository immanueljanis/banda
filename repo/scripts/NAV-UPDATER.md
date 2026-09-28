# Testnet mock NAV updater

This standalone Node worker renews existing valid mock quotes for strategies 1–5.
It preserves prices; it does not fetch market prices or attest real asset value.
No contract upgrades or unpausing are performed. Quotes are renewed even while
paused so valid redemption remains possible.

## Configuration and start

Run from repo with Node or Bun installed. Set these variables in the worker's
server environment (never NEXT_PUBLIC variables, source files, or Git):

- ROBINHOOD_TESTNET_RPC_URL: private testnet RPC.
- BANDA_OPERATOR_PRIVATE_KEY: dedicated operator key, required only for broadcast.
  Use your hosting secret store. Do not reuse the admin key. Existing Foundry
  keystores are not automatically loaded or exported by this worker.

Run a read-only simulation first:

    bun run nav:check

Then start the long-running process:

    bun run nav:worker

For one broadcast cycle: node scripts/nav-updater.mjs --broadcast --once

Node does not automatically load Next.js .env.local; inject the variables into
the process through your service manager. Keep only ONE replica with this
operator key. Run on an always-on worker host, not a Next.js request handler.
No hosting service is provisioned by this change.

## Behavior and operations

The worker polls every 30 seconds and renews at half of either on-chain freshness
window (currently 450 seconds or 10 parent blocks). It uses l1BlockNumber and
timestamp from the same header, pins quote reads to that L2 block, simulates,
checks pending nonces and gas reserve, then submits sequentially. It requires
estimated transaction cost with headroom plus 0.0001 ETH reserve. Fund the
operator separately; the script does not transfer funds.

The adapter address is pinned to the deployed secure mock. An adapter change,
invalid quote, missing parent metadata, wrong signer or low gas stops the worker.
Monitor structured stdout logs and process exit status. RPC errors are redacted.

A host-local exclusive lock in the OS temporary directory prevents overlapping
processes on that host. This is NOT a distributed lock: replicas on other hosts
must not share this signer. On a send/receipt timeout the lock is retained.
Inspect the logged transaction hash, operator latest/pending nonce, and receipt
before manually removing that specific lock and restarting. A crash can also
leave a lock; check its PID and pending transactions first. Do not automatically
delete locks on restart. SIGINT/SIGTERM stops after the active operation.

The worker has not been activated until secrets, funding and an always-on
process are configured. First live acceptance: all five quotes fresh, successful
receipt logs, healthy quotes skipped next cycle, frontend redemption preview
available, and an observable low-balance/failure alert.
