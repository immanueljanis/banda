# Banda contracts

Foundry workspace for Banda's on-chain implementation. The contract entry point is
an [EIP-2535 Diamond](https://eips.ethereum.org/EIPS/eip-2535), so the public
surface is divided by responsibility while all facets use one namespaced storage
layout.

```text
src/
  diamond/       EIP-2535 proxy, cut, loupe, ownership and shared storage
  banda/
    facets/      administrative policy, Basket ERC-721, deposit lifecycle, views
    accounts/    restricted account implementation used by the test registry
    interfaces/  external boundaries (USDG, strategy, ERC-6551 registry)
    libraries/   namespaced Banda storage
    mocks/       local-only USDG, strategy and ERC-6551 registry fixtures
test/            lifecycle and authorization tests
script/          guarded Robinhood Chain testnet deployment rehearsal
```

The current deployment procedure is documented in
[ROBINHOOD_TESTNET.md](ROBINHOOD_TESTNET.md). It targets chain ID `46630` and
uses explicit test-only dependencies until canonical testnet USDG and production
strategy integrations are verified.

## Current BND-005 slice

`DepositFacet.deposit` is atomic: it pulls the settlement token with an exact
balance check, mints a Basket NFT, obtains an account from an injected ERC-6551
registry interface, deposits to an approved strategy, and records the received
shares. Any failure reverts the whole transaction. Deposit includes a reentrancy
guard and revokes its temporary strategy allowance.

`RedeemFacet` supports partial and full redemption of the configured strategy.
Partial redemption preserves the NFT and account; a full redemption pays before
the NFT is burned. It checkpoints the configured annual management fee against
the strategy's fixture NAV and allocates the accrued liability pro-rata at
redemption, so the same liability is not deducted twice. `previewRedeem` returns
the gross, fee, and net quote; `redeem` requires the caller's minimum net payout
and rolls back the strategy, accounting, and NFT lifecycle if either fee or owner
payout fails. The local
`Mock6551Registry`, `BasketAccount`, `MockUSDG`, and `MockStrategy` are
test fixtures. They are not a deployment, canonical USDG integration, or evidence
that a production ERC-6551 registry/strategy is ready. Oracle-backed NAV gating,
standalone fee collection, and mandate-bound rebalance remain the next BND-005
facets and must be implemented before a deployment claim.

## BND-016 gateway fixture

`MockGatewayStrategy` demonstrates the intended settlement path in a local test:
the Diamond receives mock USDG, buys a canonical test asset through
`MockUsdGAssetPool`, and the Basket account holds that asset. A partial redemption
sells part of the position and returns mock USDG to the Basket NFT owner. The
fixture uses a fixed price and local mock assets only; it neither establishes
testnet USDG availability nor proves mainnet liquidity, a bridge, or a production
execution venue. The suite also verifies that a failed minimum-payout check rolls
back the canonical asset position and pool balances.

The mainnet asset identity, pricing, liquidity, exit, and exposure gates are
tracked in [ASSET_ADMISSION.md](ASSET_ADMISSION.md). No production asset is
enabled by the local gateway fixture.
The USDG yield-vault candidate and its unresolved deposit/redeem checks are
tracked in [YIELD_ADMISSION.md](YIELD_ADMISSION.md).

## BND-008 rebalance fixture

The Diamond owner configures a separate rebalance operator and an allocation
range for each strategy. The operator can trigger `RebalanceFacet.rebalance`
only for an existing basket, only while deposits and rebalances are unpaused,
and only through that basket's configured strategy. The call requires a reason,
a fresh NAV quote before and after execution, a minimum resulting NAV, and an
unchanged strategy share count. The local test rebalances two basket accounts
independently and checks their shares and NFT ownership.

`MockRebalanceStrategy` records sleeve percentages but executes no swap. The
fixture does not establish asset-level mandate enforcement, actual rebalance
execution, account-specific NAV, or production readiness.

## BND-009 ownership transfer fixture

Transferring a Basket NFT moves redeem authority to the new owner while the
ERC-6551 account and its strategy shares stay in place. Token-level approvals
are cleared on transfer, and only the Diamond can execute account calls.
`safeTransferFrom` checks contract recipients; a rejected recipient rolls
back the ownership change. These behaviors are covered in
`test/BandaNFTTransfer.t.sol`.

Run the focused suite from `repo/`:

```text
forge test --root contracts --match-path test/BandaDeposit.t.sol -vvv
```
