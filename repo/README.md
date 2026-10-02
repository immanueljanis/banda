# Banda

**Composable ETFs onchain. One token, every asset inside.**

Banda turns a mix of stocks, crypto and gold into one token you own. Deposit USDG and you receive a Basket: an ERC-721 token with its own ERC-6551 vault that holds every asset inside. Send the token and the whole portfolio moves with it, without selling anything.

Live on Robinhood Chain testnet: [www.bandafinance.xyz](https://www.bandafinance.xyz)

- **5 live demo Baskets:** NEURAL (AI), RAILS (digital finance), RESERVE (balanced core), FRONTIER (future tech), FORTRESS (hard assets with income). Banda curates them today; open Basket creation is on the roadmap.
- **Fees:** 0% to buy, 0% to withdraw, 0.25% a year, charged only on withdrawal.
- **Settlement:** Paxos' official testnet USDG.
- **Prices:** Chainlink feeds on Robinhood Chain mainnet, normalized through USDG/USD, with CoinGecko for assets that have no feed there (SOL, TAO, NEAR, RENDER).

## Testnet honesty

- Vault holdings are clearly labelled practice tokens, minted and burned by the pool and bought and sold at live market prices. They are not the real assets.
- The income portion (10–25% of each Basket) holds USDG and earns nothing on testnet. The mainnet design places it in a USDG yield vault; see [YIELD_ADMISSION.md](contracts/YIELD_ADMISSION.md).
- History charts are hypothetical backtests on real closing prices, not a record of trades.
- Admin is a single key on testnet. A multisig and timelock come before mainnet.

## How it works

```text
User ──USDG──▶ Diamond (EIP-2535)
                 ├─ mints Basket NFT (ERC-721)
                 ├─ creates the Basket's restricted ERC-6551 vault
                 └─ BasketStrategy buys every leg into the vault via PricedAssetPool
Withdraw: the vault's share of each leg is sold back to USDG and paid to the NFT owner.
```

- **Diamond facets:** deposit, redeem (holdings-aware), Basket NFT, views, admin, NAV guard, rebalance. One namespaced storage layout.
- **BasketAccount:** an ERC-6551 vault that only the Diamond can operate, with a short allow-list of actions.
- **PricedAssetPool:** an updater publishes prices. It rejects prices older than 15 minutes and moves of more than 20% per update.
- **NAV guard:** quotes must be fresh within 900 seconds and 20 parent (L1) blocks.
- **SettlementMigrationInit:** switches the settlement asset and refuses to run while any Basket is open. Every live migration was rehearsed on a fork of live state first.

| Contract | Address (chain 46630) |
| --- | --- |
| Diamond | [`0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7`](https://explorer.testnet.chain.robinhood.com/address/0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7) |
| Paxos USDG (settlement) | [`0x7E955252E15c84f5768B83c41a71F9eba181802F`](https://explorer.testnet.chain.robinhood.com/address/0x7E955252E15c84f5768B83c41a71F9eba181802F) |
| PricedAssetPool | [`0x938dc51789b1023f7ab7a63d420aa10351af2681`](https://explorer.testnet.chain.robinhood.com/address/0x938dc51789b1023f7ab7a63d420aa10351af2681) |
| Strategies 21–25 | see `contracts/broadcast/MigratePaxosPricedRobinhoodTestnet.s.sol/46630/run-latest.json` |

## Stack

- **Contracts:** Solidity 0.8.30, Foundry (`contracts/`).
- **App:** Next.js 15, React 19, viem, Privy (email, Google or wallet sign-in), deployed on Vercel.
- **Backend:** a Bun service on Railway (`scripts/nav-server.mjs`). When a signed-in user starts a buy or withdrawal, it publishes fresh market prices and a NAV quote. It verifies Privy JWTs, accepts only the exact app origin, writes to a persistent journal and is capped at 120 updates a day. It runs as a single instance with a dedicated operator key that is not the admin.
- **Indexer:** reads Basket ownership straight from Diamond storage through multicall, so no database is needed.

## Run locally

```sh
bun install
cp .env.example .env.local   # fill in the Privy app id and RPC URLs
bun run dev
```

Get testnet USDG from the [Paxos faucet](https://faucet.paxos.com/?network=robinhood) and testnet ETH for gas from the Robinhood Chain faucet.

`bun run check` runs everything: the Node test suites, the Foundry tests, `tsc` and `next build`. For a single contract suite:

```sh
forge test --root contracts --match-contract Banda
```

## Roadmap

1. Issuer-bridged real assets and the USDG yield portion on Robinhood Chain mainnet. The admission criteria are in [ASSET_ADMISSION.md](contracts/ASSET_ADMISSION.md).
2. A security audit, a multisig admin and a timelock.
3. Open Basket creation, and Baskets used as building blocks in other protocols.
