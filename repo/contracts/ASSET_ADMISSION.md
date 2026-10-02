# BND-017: Robinhood Chain asset admission

Status: research gate, 21 September 2026. No asset in this document is approved
for a production Banda basket. BND-016 uses local mock assets and liquidity.
This checklist records what must be proven before `candidate` becomes `enabled`.

## Required record per asset

| Field | Evidence required |
| --- | --- |
| Identity | Origin chain and token address, Robinhood Chain ID `4663` and token address, issuer or bridge route, and primary source for the canonical mapping. Never identify by ticker alone. |
| Price | On-chain feed or verifiable report address, quote unit, decimals, heartbeat/freshness, and behavior during market closures or oracle outage. An HTTP quote alone cannot authorize on-chain mint/redeem. |
| Entry | Executable USDG-to-asset quote for a contract taker at the intended basket size, venue/pool address, fees, slippage, and actual balance delta. |
| Exit | Executable asset-to-USDG quote and balance delta for partial and full redemption; record worst observed payout and failure behavior. A bridge route alone does not supply exit liquidity. |
| Limit | Per-asset target and maximum portfolio weight, maximum trade size relative to executable depth, and concentration across baskets. These are unset until approved. |
| Operations | Quote expiry, paused market behavior, monitoring owner, and the action when liquidity or oracle evidence expires. |

Admission rule: `enabled` requires all fields above and a buy/sell rehearsal on the
same chain and venue at the proposed size. Any missing field keeps the asset a
`candidate`. The testnet gateway does not satisfy these mainnet gates.

## Candidate groups

### Verified identity leads (21 September 2026)

The [Robinhood Chain token-contract page](https://docs.robinhood.com/chain/contracts/)
directly lists these chain-4663 contracts. These are **identity leads**, not
asset admission or evidence that a Banda contract can trade them:

| Asset | Robinhood Chain contract | Identity source | Missing before `enabled` |
| --- | --- | --- | --- |
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | Official token-contract page | Independently read chain ID, code, token metadata and balances; verify issuer mapping, USDG/USD price policy, settlement and redemption. |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` | Official token-contract page | Independently read code and metadata; verify feed, executable USDG buy/sell route and depth at planned size. |

The [Stock Token `/assets` API](https://docs.robinhood.com/chain/stock-token-apis/)
publishes each token's `uid`, status, chain-specific deployment, trading
capabilities, and corporate-action multiplier. At configuration time, record
the exact response and block number, verify the selected chain-4663 contract's
`uid()` and code on-chain, and check the status and trading window. The live
registry table is not captured in this document, so no stock-token address is
hardcoded here. A symbol or API row alone does not establish a usable USDG
execution route.

### Evidence still required

For each proposed venue, archive a timestamped quote and transaction receipt
for **both** USDG-to-asset and asset-to-USDG at the intended trade size. Record
venue and pool/router addresses, input/output balance deltas, total execution
cost, price impact, minimum output, and the failure case when the quote expires.
Rehearse a partial redeem and a full redeem through the actual venue. The
[official bridging guide](https://docs.robinhood.com/chain/bridging/) lists
WBTC and USDG among OFT examples, but bridge availability does not establish
the selected WBTC token address, an immediate asset-to-USDG sale, or an atomic
basket exit. The canonical L1-to-L2 withdrawal also has a seven-day challenge
period, so it cannot stand in for a same-transaction USDG payout.

| Basket targets | Identity route to check | Current admission gap |
| --- | --- | --- |
| NVDA, GOOGL, COIN, CRCL, SPY, GLD, QQQ, AMD, TSLA, USO | Robinhood Stock Token registry deployment on chain 4663; compare token UID/address with the live registry | Capture address and on-chain feed per token, then prove USDG buy/sell depth and exit at the target size. Check trading capability and corporate-action multiplier. |
| USDG | Paxos/issuer and Robinhood Chain deployment | Record canonical mainnet address, USDG/USD price policy, settlement and redemption route. Testnet USDG remains unverified. |
| WETH | Robinhood Chain deployed token and bridge/issuer mapping | Revalidate chain 4663 address, feed, and two-way USDG depth for the intended size. Existing BND-003 fork evidence only covers a small trade. |
| WBTC | Issuer/OFT or canonical bridge mapping, with one selected L2 address | An OFT bridge example is not proof of a canonical contract, active pool, sufficient depth, or exit. |
| SOL, LINK, NEAR, TAO, RENDER | Issuer-approved representation or bridge mapping | No canonical Robinhood Chain address, NAV feed, or executable USDG route accepted yet. Keep disabled. |

The planned weights below are product targets from `constants/baskets.ts`, not
approved maximum exposures. The maximum is **unset for every asset** pending
liquidity and risk review; no smart-contract admission/configuration may infer
it from a target weight.

| Basket | Target weights (percent) |
| --- | --- |
| NEURAL | NVDA 30, TAO 20, GOOGL 15, NEAR 10, GLD 10, USDG yield 15 |
| RAILS | COIN 20, CRCL 15, WETH 20, SOL 15, LINK 10, GLD 5, USDG yield 15 |
| RESERVE | WBTC 30, SPY 25, GLD 20, WETH 10, USDG yield 15 |
| FRONTIER | QQQ 25, AMD 15, TSLA 15, RENDER 15, SOL 10, GLD 5, USO 5, USDG yield 10 |
| FORTRESS | GLD 30, SPY 20, WBTC 15, WETH 10, USDG yield 25 |

The USDG yield sleeve also needs its own ERC-4626 vault address, receipt-token
valuation, liquidity, and redeem evidence before production use.

For Stock Tokens, the [official contract registry](https://docs.robinhood.com/chain/contracts/)
is the identity source. Its table is live, so record a timestamped address and
on-chain verification at admission time. The [Stock Token API](https://docs.robinhood.com/chain/stock-token-apis/)
provides off-chain metadata and multiplier information; its raw equity bid/ask
differs from the multiplier-adjusted on-chain feed. The
[Stock Token guide](https://docs.robinhood.com/chain/stock-tokens/) describes
trading windows and issuer restrictions. The
[bridging guide](https://docs.robinhood.com/chain/bridging/) identifies possible
routes for WBTC and USDG, but says bridged L2 addresses differ from origin
addresses. None of these sources proves Banda can execute a USDG swap.

## Hackathon boundary

Jurisdiction for a real launch is undecided. Stock Tokens have issuer eligibility
and geographic restrictions; resolve that before public mainnet access. The
hackathon can demonstrate admission states with mock assets and clearly labelled
simulated execution. Do not present the candidate list, displayed weights, or
mock balances as a live investable basket.
