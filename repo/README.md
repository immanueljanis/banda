# Banda

Landing page and interactive frontend demo built from `../PRD.md` and `../FE-PROMPT.md`.

## Run

```powershell
npm install
npm run dev
```

Open http://localhost:3000. Routes: `/`, `/basket/core`, `/basket/frontier`, `/portfolio`, `/docs`.

## Validate

```powershell
npm run check
npm run test:e2e
```

Browser checks use installed Microsoft Edge. The suite starts a production server on port 3100 after a build.

## Scope

Estimated yields are dated snapshots in `lib/data/yield-snapshot.json`, refreshed with `node scripts/fetch-yield-data.mjs`. Aave V3 native USDC on Arbitrum uses DefiLlama base supply APY; Lido APR is converted to an estimated APY with daily compounding. Basket estimates weight the yield-bearing assets by allocation and exclude Banda fees, price changes and incentives. These rates are separate from the 2025 historical price comparison.

Next.js 15 App Router, strict TypeScript, Tailwind 4, Motion 12 and Recharts. Manrope and Geist Mono are self-hosted by next/font after being fetched during the first build. Light is primary; the theme switch persists the preference locally. The hero remains readable without JavaScript and skips motion when requested.

`lib/mock.ts` contains illustrative basket values and allocations. `lib/backtest.ts` models hypothetical buy-and-hold portfolios against the S&P 500 price index using daily Yahoo Finance prices from June–September 2025. Each period resets to $10,000; fees and dividends are excluded. BTC/ETH proxy wrapped assets; aUSDC uses a $1 cash proxy without interest. Source prices are downloadable in the Historical and Resources tabs. Refresh the snapshot and local asset logos with `node scripts/fetch-market-data.mjs`.

Basket details include About, Historical, Rebalances, Risk and Resources, allocation donuts, asset cards and accessible asset explanations. `useWallet()` is an in-memory simulation with a 2,500 USDC demo balance. Reloading resets purchases. No wallet library or contract integration is included. Deposit and transfer are not implemented.

PostCSS is overridden to a patched compatible 8.x release to keep the requested Next.js 15 stack without its vulnerable transitive version.
