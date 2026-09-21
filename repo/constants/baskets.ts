export type BasketCategory =
  "Tokenized markets" | "Crypto" | "Real assets" | "DeFi yield";

export type Holding = {
  ticker: string;
  name: string;
  category: BasketCategory;
  weight: number;
  change: number;
};

export type BasketAllocation = {
  label: BasketCategory;
  weight: number;
};

export type Basket = {
  slug: string;
  name: string;
  thesis: string;
  character: string;
  id: number;
  mandate: string;
  nav: number;
  change: number;
  block: number;
  managementFee: number;
  holdings: Holding[];
  allocation: BasketAllocation[];
  history: { day: string; value: number }[];
};

export type AssetFact = { label: string; detail: string; source: string };
export type AssetDefinition = {
  name: string;
  description: string;
  color: string;
  url: string;
};

const history = (nav: number, growth: number) =>
  Array.from({ length: 30 }, (_, index) => ({
    day: `Aug ${index + 1}`,
    value: Math.round(
      nav *
        (1 -
          growth / 100 +
          ((growth / 100) * index) / 29 +
          (index === 29 ? 0 : Math.sin(index * 1.8) * 0.006)),
    ),
  }));

const allocationFor = (holdings: Holding[]): BasketAllocation[] =>
  (["Tokenized markets", "Crypto", "Real assets", "DeFi yield"] as const)
    .map((label) => ({
      label,
      weight: holdings
        .filter((holding) => holding.category === label)
        .reduce((total, holding) => total + holding.weight, 0),
    }))
    .filter((allocation) => allocation.weight > 0);

const basket = (config: Omit<Basket, "allocation" | "history">): Basket => ({
  ...config,
  allocation: allocationFor(config.holdings),
  history: history(config.nav, config.change),
});

export const BASKETS: Basket[] = [
  basket({
    slug: "neural",
    name: "NEURAL",
    thesis: "Artificial Intelligence",
    character: "Aggressive growth",
    id: 1101,
    mandate: "Own the intelligence stack, from silicon to decentralized AI.",
    nav: 12_480.36,
    change: 8.74,
    block: 63_794_454,
    managementFee: 2,
    holdings: [
      {
        ticker: "NVDA",
        name: "Tokenized NVIDIA",
        category: "Tokenized markets",
        weight: 30,
        change: 2.18,
      },
      {
        ticker: "TAO",
        name: "Bittensor",
        category: "Crypto",
        weight: 20,
        change: 1.64,
      },
      {
        ticker: "GOOGL",
        name: "Tokenized Alphabet",
        category: "Tokenized markets",
        weight: 15,
        change: 0.82,
      },
      {
        ticker: "NEAR",
        name: "NEAR",
        category: "Crypto",
        weight: 10,
        change: -0.44,
      },
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 10,
        change: 0.31,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 15,
        change: 0.01,
      },
    ],
  }),
  basket({
    slug: "rails",
    name: "RAILS",
    thesis: "Onchain Financial Economy",
    character: "Crypto growth",
    id: 1202,
    mandate: "Own the infrastructure powering the internet of money.",
    nav: 10_842.18,
    change: 6.38,
    block: 63_794_454,
    managementFee: 2,
    holdings: [
      {
        ticker: "COIN",
        name: "Coinbase Stock Token",
        category: "Tokenized markets",
        weight: 20,
        change: 1.93,
      },
      {
        ticker: "CRCL",
        name: "Circle Stock Token",
        category: "Tokenized markets",
        weight: 15,
        change: 1.27,
      },
      {
        ticker: "ETH",
        name: "Ether",
        category: "Crypto",
        weight: 20,
        change: 1.15,
      },
      {
        ticker: "SOL",
        name: "Solana",
        category: "Crypto",
        weight: 15,
        change: 2.21,
      },
      {
        ticker: "LINK",
        name: "Chainlink",
        category: "Crypto",
        weight: 10,
        change: 0.74,
      },
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 5,
        change: 0.31,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 15,
        change: 0.01,
      },
    ],
  }),
  basket({
    slug: "reserve",
    name: "RESERVE",
    thesis: "Diversified Core",
    character: "Balanced",
    id: 1303,
    mandate: "Growth, scarcity and yield, built for every market regime.",
    nav: 11_294.72,
    change: 4.26,
    block: 63_794_454,
    managementFee: 1,
    holdings: [
      {
        ticker: "BTC",
        name: "Bitcoin",
        category: "Crypto",
        weight: 30,
        change: 1.24,
      },
      {
        ticker: "SPY",
        name: "Tokenized S&P 500 ETF",
        category: "Tokenized markets",
        weight: 25,
        change: 0.56,
      },
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 20,
        change: 0.31,
      },
      {
        ticker: "ETH",
        name: "Ether",
        category: "Crypto",
        weight: 10,
        change: 1.15,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 15,
        change: 0.01,
      },
    ],
  }),
  basket({
    slug: "frontier",
    name: "FRONTIER",
    thesis: "Future Technology",
    character: "Growth",
    id: 1404,
    mandate:
      "A basket for the technologies rewriting how we compute, move and transact.",
    nav: 9_836.54,
    change: 7.92,
    block: 63_794_454,
    managementFee: 2,
    holdings: [
      {
        ticker: "QQQ",
        name: "Tokenized Nasdaq-100 ETF",
        category: "Tokenized markets",
        weight: 25,
        change: 0.91,
      },
      {
        ticker: "AMD",
        name: "Tokenized AMD",
        category: "Tokenized markets",
        weight: 15,
        change: 1.42,
      },
      {
        ticker: "TSLA",
        name: "Tokenized Tesla",
        category: "Tokenized markets",
        weight: 15,
        change: -0.67,
      },
      {
        ticker: "RENDER",
        name: "Render",
        category: "Crypto",
        weight: 15,
        change: 2.35,
      },
      {
        ticker: "SOL",
        name: "Solana",
        category: "Crypto",
        weight: 10,
        change: 2.21,
      },
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 5,
        change: 0.31,
      },
      {
        ticker: "USO",
        name: "Tokenized oil ETF",
        category: "Real assets",
        weight: 5,
        change: -0.28,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 10,
        change: 0.01,
      },
    ],
  }),
  basket({
    slug: "fortress",
    name: "FORTRESS",
    thesis: "Hard Assets & Income",
    character: "Defensive",
    id: 1505,
    mandate: "Built to preserve capital while keeping it productive.",
    nav: 10_618.9,
    change: 3.18,
    block: 63_794_454,
    managementFee: 1,
    holdings: [
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 30,
        change: 0.31,
      },
      {
        ticker: "SPY",
        name: "Tokenized S&P 500 ETF",
        category: "Tokenized markets",
        weight: 20,
        change: 0.56,
      },
      {
        ticker: "BTC",
        name: "Bitcoin",
        category: "Crypto",
        weight: 15,
        change: 1.24,
      },
      {
        ticker: "ETH",
        name: "Ether",
        category: "Crypto",
        weight: 10,
        change: 1.15,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 25,
        change: 0.01,
      },
    ],
  }),
];

export const ASSETS: Record<string, AssetDefinition> = {
  NVDA: {
    name: "NVIDIA",
    description:
      "Target exposure to NVIDIA through an admitted Robinhood Stock Token. Availability and liquidity must be verified before execution.",
    color: "#52734f",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  TAO: {
    name: "Bittensor",
    description:
      "TAO provides exposure to Bittensor's decentralized machine-intelligence network. It remains a candidate asset for Robinhood Chain.",
    color: "#866d46",
    url: "https://docs.bittensor.com/",
  },
  GOOGL: {
    name: "Alphabet",
    description:
      "Target exposure to Alphabet through an admitted Robinhood Stock Token.",
    color: "#758b6d",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  NEAR: {
    name: "NEAR",
    description:
      "NEAR provides exposure to smart-contract and agent infrastructure. It remains a candidate asset for Robinhood Chain.",
    color: "#8a9a88",
    url: "https://docs.near.org/",
  },
  GLD: {
    name: "Gold ETF",
    description:
      "Target gold exposure through the admitted GLD Robinhood Stock Token.",
    color: "#b1914d",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  USDG: {
    name: "USDG DeFi Yield",
    description:
      "USDG allocated to an admitted DeFi strategy. Yield varies and the production vault has not been integrated.",
    color: "#729384",
    url: "https://www.paxos.com/usdg",
  },
  COIN: {
    name: "Coinbase",
    description:
      "Target exposure to Coinbase through an admitted Robinhood Stock Token.",
    color: "#496c91",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  CRCL: {
    name: "Circle",
    description:
      "Target exposure to Circle through an admitted Robinhood Stock Token.",
    color: "#668b91",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  ETH: {
    name: "Ethereum",
    description:
      "Ether exposure represented by the canonical admitted token used by the basket.",
    color: "#8298bb",
    url: "https://ethereum.org/en/eth/",
  },
  SOL: {
    name: "Solana",
    description:
      "SOL provides exposure to the Solana network. It remains a candidate asset for Robinhood Chain.",
    color: "#7b7ea0",
    url: "https://solana.com/",
  },
  LINK: {
    name: "Chainlink",
    description:
      "LINK provides exposure to Chainlink's oracle and interoperability network. It remains a candidate asset for Robinhood Chain.",
    color: "#637fa8",
    url: "https://chain.link/",
  },
  BTC: {
    name: "Bitcoin",
    description:
      "Bitcoin exposure represented by an admitted canonical wrapped asset on Robinhood Chain.",
    color: "#bd8951",
    url: "https://bitcoin.org/",
  },
  SPY: {
    name: "S&P 500 ETF",
    description:
      "Target broad US equity exposure through an admitted SPY Robinhood Stock Token.",
    color: "#66795e",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  QQQ: {
    name: "Nasdaq-100 ETF",
    description:
      "Target broad technology exposure through an admitted QQQ Robinhood Stock Token.",
    color: "#5f755a",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  AMD: {
    name: "AMD",
    description:
      "Target exposure to AMD through an admitted Robinhood Stock Token.",
    color: "#8d6a55",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  TSLA: {
    name: "Tesla",
    description:
      "Target exposure to Tesla through an admitted Robinhood Stock Token.",
    color: "#93645f",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  RENDER: {
    name: "Render",
    description:
      "RENDER provides exposure to decentralized GPU compute. It remains a candidate asset for Robinhood Chain.",
    color: "#9a735f",
    url: "https://rendernetwork.com/",
  },
  USO: {
    name: "Oil ETF",
    description:
      "Target oil exposure through an admitted USO Robinhood Stock Token.",
    color: "#8b7650",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
};

export const ASSET_FACTS: Record<string, { yield?: AssetFact }> = {
  USDG: {
    yield: {
      label: "DeFi yield",
      detail:
        "A defined USDG sleeve is intended for an admitted DeFi vault. Rates are variable; vault risk, liquidity and redemption must be verified before activation.",
      source: "https://docs.morpho.org/learn/concepts/vault-v2/",
    },
  },
};

export const YIELD_SNAPSHOTS: Record<
  string,
  {
    apy: number;
    asOf: string;
    source: string;
    provider: string;
    method: string;
  }
> = {
  USDG: {
    apy: 3.63,
    asOf: "2026-09-21T00:00:00.000Z",
    source:
      "https://app.morpho.org/robinhood-chain/vault/0xBeEff033F34C046626B8D0A041844C5d1A5409dd/steakhouse-usdg?tab=vault",
    provider: "Morpho · Steakhouse USDG candidate",
    method:
      "Illustrative app snapshot. The vault is a candidate and has not been integrated or transaction-tested by Banda.",
  },
};

export const yieldSnapshotDate = "2026-09-21T00:00:00.000Z";

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
