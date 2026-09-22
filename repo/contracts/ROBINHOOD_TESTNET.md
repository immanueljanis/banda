# Robinhood Chain testnet rehearsal

The deployment target for the Open House sprint is Robinhood Chain testnet,
chain ID `46630`. The rehearsal script refuses to run on any other chain.

It deploys the Banda Diamond and every current facet, a restricted Basket account
implementation, a local ERC-6551 registry fixture, public-mint `tUSDG`, a mock NAV
adapter, and five independent mock strategies. Their annual management fees match
the product catalog: NEURAL 2%, RAILS 2%, RESERVE 1%, FRONTIER 2%, and FORTRESS
1%. The final deployment is paused, so the admin must explicitly refresh the NAV
fixture and unpause before a smoke deposit.

These mocks test transaction flow only. They are not canonical USDG, production
ERC-6551 infrastructure, real asset execution, or mainnet-ready strategies.

## Required wallets

- `BANDA_ADMIN` must equal the address derived from `DEPLOYER_PRIVATE_KEY`. It owns
  the Diamond and controls configuration, upgrades, and manual pause.
- `BANDA_OPERATOR` must be a different non-zero wallet. It can execute configured
  rebalances but cannot upgrade or pause the Diamond.
- `BANDA_FEE_RECIPIENT` receives accrued management fees in the fixture and may be
  the admin wallet for this testnet rehearsal.

Run the following commands from `repo/contracts`. Copy `.env.example` into your
local shell environment. Never commit populated values. Import the admin signer
into Foundry's encrypted keystore; do not place its private key in this file:

```text
cast wallet import banda-admin --interactive
```

The admin needs Robinhood Chain testnet gas.

Dry-run against the public endpoint:

```text
forge script script/DeployRobinhoodTestnet.s.sol:DeployRobinhoodTestnet \
  --rpc-url robinhood_testnet --sender $BANDA_ADMIN -vvvv
```

Broadcast only after the dry-run returns chain ID `46630` and the expected admin:

```text
forge script script/DeployRobinhoodTestnet.s.sol:DeployRobinhoodTestnet \
  --rpc-url robinhood_testnet --account banda-admin \
  --sender $BANDA_ADMIN --broadcast -vvvv
```

Foundry writes receipts and deployed addresses below
`contracts/broadcast/DeployRobinhoodTestnet.s.sol/46630/`. Preserve the broadcast
artifact for testnet reproducibility, but do not describe this fixture as a
production deployment.
