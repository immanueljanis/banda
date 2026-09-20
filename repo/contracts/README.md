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
```

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
redemption, so the same liability is not deducted twice. The local
`Mock6551Registry`, `BasketAccount`, `MockUSDG`, and `MockStrategy` are
test fixtures. They are not a deployment, canonical USDG integration, or evidence
that a production ERC-6551 registry/strategy is ready. Oracle-backed NAV gating,
standalone fee collection, and mandate-bound rebalance remain the next BND-005
facets and must be implemented before a deployment claim.

Run the focused suite from `repo/`:

```text
forge test --root contracts --match-path test/BandaDeposit.t.sol -vvv
```
