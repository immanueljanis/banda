export type Holding = {
  ticker: string;
  name: string;
  category: string;
  weight: number;
  change: number;
};
export type Basket = {
  slug: string;
  name: string;
  id: number;
  mandate: string;
  nav: number;
  change: number;
  base: number;
  incentives: number;
  block: number;
  holdings: Holding[];
  allocation: [number, number, number];
  history: { day: string; value: number }[];
};
const history = (nav: number, growth: number) =>
  Array.from({ length: 30 }, (_, i) => ({
    day: `Aug ${i + 1}`,
    value: Math.round(
      nav *
        (1 -
          growth / 100 +
          ((growth / 100) * i) / 29 +
          (i === 29 ? 0 : Math.sin(i * 1.8) * 0.006)),
    ),
  }));
export const BASKETS: Basket[] = [
  {
    slug: "core",
    name: "Banda Core",
    id: 1042,
    mandate: "Preserve value. Participate in growth.",
    nav: 12480.36,
    change: 4.82,
    base: 3.6,
    incentives: 0.8,
    block: 278491036,
    allocation: [34, 41, 25],
    holdings: [
      {
        ticker: "PAXG",
        name: "Tokenized gold",
        category: "Real-world assets",
        weight: 34,
        change: 0.42,
      },
      {
        ticker: "wBTC",
        name: "Wrapped Bitcoin",
        category: "Crypto",
        weight: 23,
        change: 1.24,
      },
      {
        ticker: "WETH",
        name: "Wrapped Ether",
        category: "Crypto",
        weight: 18,
        change: -0.63,
      },
      {
        ticker: "aUSDC",
        name: "Aave USDC",
        category: "On-chain yield",
        weight: 15,
        change: 0.01,
      },
      {
        ticker: "wstETH",
        name: "Lido staked Ether",
        category: "On-chain yield",
        weight: 10,
        change: -0.48,
      },
    ],
    history: history(12480.36, 4.82),
  },
  {
    slug: "frontier",
    name: "Banda Frontier",
    id: 2086,
    mandate: "A considered position on what comes next.",
    nav: 8362.14,
    change: 12.64,
    base: 4.2,
    incentives: 2.1,
    block: 278491036,
    allocation: [0, 80, 20],
    holdings: [
      {
        ticker: "ARB",
        name: "Arbitrum",
        category: "Crypto",
        weight: 30,
        change: 2.14,
      },
      {
        ticker: "GMX",
        name: "GMX",
        category: "Crypto",
        weight: 25,
        change: -1.32,
      },
      {
        ticker: "PENDLE",
        name: "Pendle",
        category: "Crypto",
        weight: 25,
        change: 3.21,
      },
      {
        ticker: "aUSDC",
        name: "Aave USDC",
        category: "On-chain yield",
        weight: 20,
        change: 0.01,
      },
    ],
    history: history(8362.14, 12.64),
  },
];
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
