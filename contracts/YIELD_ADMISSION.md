# BND-012: USDG yield sleeve admission

Research snapshot: 21 September 2026. **Candidate, not enabled.** Banda's planned
USDG yield sleeve needs an executable same-chain USDG deposit and USDG redemption;
a displayed APY or total deposits alone cannot establish that.

## Candidate: Steakhouse USDG on Morpho

| Item | Evidence and current status |
| --- | --- |
| Network and vault | Robinhood Chain mainnet (chain ID `4663`), Morpho Vault V2 at [`0xBeEff033F34C046626B8D0A041844C5d1A5409dd`](https://app.morpho.org/robinhood-chain/vault/0xBeEff033F34C046626B8D0A041844C5d1A5409dd/steakhouse-usdg?tab=vault). Curator shown as Steakhouse Financial. Address is from the Morpho app; verify bytecode, `asset()`, gates and ERC-4626 functions against an on-chain block snapshot before integration. |
| Strategy | Morpho describes lending USDG against several collateral types. Underlying market exposures, oracle choices, loan-to-value limits and allocation caps can change under vault governance; record them at the admission block. |
| Snapshot, not forecast | Morpho's page displayed about **488.4M USDG deposited**, **54.56M USDG liquidity**, and **3.63% net APY** when checked. These are app display values, not a quote Banda has executed, a liquidity commitment, or a guaranteed return. Re-fetch for any investor-facing display and label its timestamp. |
| Fees | Morpho's page displayed 0% vault management and 0% vault performance fee at the snapshot. Recheck on-chain. Banda's separate management fee remains subject to its own NAV rules; do not present Morpho APY as Banda net return. |
| Deposit | Not yet tested from Banda's ERC-6551 account. Check `maxDeposit`, share balance delta, approval handling, receipt custody, and atomic rollback on failure. |
| USDG exit | Not yet tested. Check `maxWithdraw`/`maxRedeem`, `previewWithdraw`/`previewRedeem`, actual USDG balance delta, partial and full redemption, and failure when liquidity is unavailable. Do not treat Morpho's in-kind emergency exit as equivalent to Banda's promised USDG payout. |

[Morpho Vault V2 documentation](https://docs.morpho.org/learn/concepts/vault-v2/)
explains that deposits and normal withdrawals use the vault's idle assets and its
liquidity adapter. If neither has enough liquidity, normal withdrawal can fail
until the allocator changes the allocation or borrowers repay. Its in-kind path
returns underlying positions and may impose a penalty; Banda currently requires
USDG on redemption, so this path does not satisfy its user flow. See also
[Morpho liquidity curation](https://docs.morpho.org/curate/concepts/liquidity/).

## Admission work before enabling

1. Pin a Robinhood Chain block and verify vault bytecode, chain ID, `asset()` equals
   the canonical USDG address, share decimals, access gates, fees, curator roles,
   liquidity adapter, and all underlying market allocations. Record explorer and
   transaction links. USDG testnet identity remains unverified.
2. On a mainnet fork, simulate contract-account deposit, share valuation and
   partial/full USDG withdrawal at the proposed basket sizes. Measure exact
   USDG received, `maxWithdraw`, rounding, and behavior when liquidity drops.
   Recheck directly before any live configuration because liquidity is dynamic.
3. Choose a conservative maximum yield-sleeve exposure and a redeemable USDG cash
   buffer from measured exit capacity. Both are currently **unset**; basket target
   weights of 10–25% are product targets, not risk limits.
4. Define how NAV values vault shares, detects impaired collateral or unrealized
   bad debt, handles vault pause/gates and oracle failure, and blocks new deposits
   when reliable pricing or USDG exit is unavailable. Include vault governance
   changes in monitoring.

Morpho documents [smart-contract, oracle, bad-debt, liquidity, and curator risks](https://docs.morpho.org/learn/resources/risks/).
Robinhood lists Morpho in its [ecosystem directory](https://docs.robinhood.com/chain/),
which identifies an ecosystem participant, not an endorsement of this vault or
proof of its suitability for Banda.
