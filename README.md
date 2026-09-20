# Banda

Managed DeFi baskets on Robinhood Chain.

Banda lets a user deposit USDG, choose a managed basket, track one portfolio, and redeem when needed. The product is designed to make multi-asset DeFi portfolio construction more accessible without asking a user to select, bridge, and monitor every asset or protocol themselves.

## Product

Each basket has a published mandate, holdings, fees, risks, and yield sources. A basket may combine growth assets, a defined DeFi yield sleeve, and liquidity discipline for rebalances and redemptions.

Users will authenticate through Privy with an embedded/smart wallet or external wallet. That wallet owns the basket NFT; a restricted ERC-6551 account holds the basket positions.

For assets not natively available on Robinhood Chain, Banda plans to use an asset-gateway pattern: an issuer or market maker supplies a canonical asset representation and a liquid USDG market before the asset can be used in a basket. Banda does not issue cross-chain wrappers or custody backing reserves in the MVP.

See [PRODUCT.md](PRODUCT.md) for product and design principles. The Next.js application lives in [`repo/`](repo/).

## Run the app

```powershell
npm --prefix repo install
npm --prefix repo run dev
```

Open `http://localhost:3000`.

## Validate

```powershell
npm --prefix repo run check
```

The current application is a local demonstration. It does not send wallet transactions, bridge assets, execute swaps, or connect to live liquidity providers.
