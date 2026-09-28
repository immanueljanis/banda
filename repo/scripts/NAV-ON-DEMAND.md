# On-demand testnet NAV preparation

The Next.js backend renews a strategy's existing mock quote when a signed-in user
prepares a deposit or redemption. No polling process, Redis, or portfolio database
is needed. This preserves the mock price; it is NOT market-price publication.

## Railway setup before enabling

Use ONE Node instance/replica, one region, no clustering. Stop the previous signer
deployment before enabling its replacement. Do not use a rolling/overlapping
deployment for this service. Disable the standalone NAV worker and any other
process using the operator account. `BANDA_NAV_SINGLE_INSTANCE=true` is an explicit
operational acknowledgement, not an automatic Railway topology check.

Mount a persistent Railway volume at `/data`, with the journal in
`/data/banda-nav`. This is a small local safety journal, not a database service.
Keep the volume across deploys; an ephemeral path would reset the daily budget
and lose ambiguous-send recovery state. The filesystem lock protects processes
sharing this directory, NOT separate containers with separate filesystems.

Set server-only variables (see `../.env.example`):

```dotenv
BANDA_NAV_ON_DEMAND=true
BANDA_NAV_SINGLE_INSTANCE=true
BANDA_APP_ORIGIN=https://bandafinance.xyz
BANDA_NAV_STATE_DIR=/data/banda-nav
PRIVY_VERIFICATION_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
BANDA_OPERATOR_PRIVATE_KEY=<dedicated-operator-key>
ROBINHOOD_TESTNET_RPC_URL=<private-rpc>
```

Keep the existing `NEXT_PUBLIC_PRIVY_APP_ID`. Copy the public ES256 verification
key from Privy Dashboard > App settings, not the app secret. Local JWT verification
checks signature, issuer, audience, expiry and subject. If Privy rotates the
verification key, update this variable and restart. `PRIVY_APP_SECRET` is not
required by this feature. Keep keys/RPC out of Git and NEXT_PUBLIC variables.

The operator must match the adapter's on-chain `updater()` and must NOT be its
owner/admin. Fund the operator separately. No funding, unpause, key export,
contract upgrade or live publication is performed by installation.

For local development use your exact frontend origin, e.g. `http://localhost:3000`,
and an absolute directory outside source control (or ignored `.nav-state`).
Do not run local and deployed signing services with the same operator key.
Restart after environment changes. Only enable after all configuration is set:
without it, quote preparation fails closed and the new Buy/Redeem flow is blocked.

## Flow and safeguards

- POST `/api/nav/prepare`, Privy bearer token, exact configured Origin and JSON
  body `{ "strategyId": 1 }`. Only integer strategy IDs 1 through 5 are accepted.
  Clients cannot supply a price, timestamp, adapter, destination, or calldata.
  All authenticated app users may request these fixed, shared quotes; the endpoint
  does not claim a supplied wallet belongs to a user or transfer user funds.
- Same-strategy concurrent calls share one job; different strategies are queued
  behind the same signer. Freshness is re-read inside the queue, not cached there.
- Header timestamp and `l1BlockNumber` come from the same RPC header. Contract
  reads are pinned to that header's L2 block number. Never use L2 block height as
  the NAV quote's observed block.
- Keep a quote if it has more than half of both configured validity windows left;
  otherwise renew it with the unchanged mock price. Invalid, future, zero-price
  or missing-metadata quotes are not silently repaired.
- Pin chain 46630 and the deployed secure mock adapter. Read signer authorization
  and current policy before each preparation. Pausing deposits does not disable
  quote renewal for redemptions; disabled deposit strategies can also be renewed.
- Simulate, estimate gas with 30% headroom, require a 0.0001 ETH remaining reserve,
  and cap transaction gas-limit times gas-price at 0.00002 ETH. A rolling 24-hour
  journal allows at most 30 submission attempts across ALL users/strategies.
  Conservatively reserved maximum gas is therefore 0.0006 ETH per rolling day;
  failed/ambiguous sends consume a slot. This is not a claim about hosting costs.
- Persistent per-strategy submission cooldown: 60 seconds. In-memory request
  limits: 12 per user/minute, 60 total/minute. These request limits reset on
  restart; submission limits do not when the journal volume is preserved.
- Check pending/latest nonces, persist intent with nonce BEFORE sending, disable
  transport retries on sends, wait for two confirmations and re-read freshness.
  Return sanitized errors only. No private RPC, key or token in logs/responses.
- No automatic retry on ambiguous submission or receipt timeout. Preserve lock
  and intent for operator review. This deliberately favors stopping over duplicates.

Buy prepares before approval and checks again after an approval receipt, because
wallet interaction can take time. Redeem previews and slider changes are read-only.
When preview is unavailable, **Prepare payout** renews the quote explicitly; the
actual Redeem action checks again before preview/simulation/signing. Preparation
has its own UI status, not a misleading wallet-signature prompt. A very slow user
signature can still outlast the quote window; this flow is not an atomic oracle
update plus user transaction.

## Recovery and live acceptance

If `NAV_LOCKED`/`NAV_PENDING` appears, stop the signer and inspect `nav.lock`,
`nav-state.json`, structured `nav_submitted` logs, transaction receipts, and the
operator's latest/pending nonce. For a recorded nonce without hash, inspect the
operator's transactions to determine whether it was accepted. Do not guess or
automatically clear a lock. After proving the outcome and no pending send, an
operator may clear the pending marker and lock, preserving submission history.
Never delete the journal to bypass limits. A rejected request or RPC outage must
not cause automatic unpause, forced quote update or a second broadcast.

Automated tests exercise token validation, route gating/redaction, concurrency,
fresh/stale lifecycle, fees, nonce checks, receipts and persistent lock/budget.
They use injected transports and generated test JWTs, not live operator secrets.

Deployment acceptance still requires:

1. Verify volume persistence, single instance and no other signer process.
2. Log in and prepare an outdated quote: one operator receipt, unchanged price,
   valid parent block/timestamp and working preview.
3. Repeat immediately: status `fresh`, no additional operator transaction.
4. Complete UI deposit, partial redeem (NFT retained), full redeem (NFT burned).
5. Confirm low gas/auth/RPC failures show a recoverable message and no user send.

This implementation does not activate hosting or claim those live checks passed.

Auth reference: [Privy access tokens](https://docs.privy.io/authentication/user-authentication/access-tokens).
