import { backtest, historicalAsset } from "@/lib/market/history";

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
  /** Plain-language thesis: the idea, why these assets in these weights, and who it suits. */
  why: { idea: string; mix: string; fit: string };
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

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const allocationFor = (holdings: Holding[]): BasketAllocation[] =>
  (["Tokenized markets", "Crypto", "Real assets", "DeFi yield"] as const)
    .map((label) => ({
      label,
      weight: holdings
        .filter((holding) => holding.category === label)
        .reduce((total, holding) => total + holding.weight, 0),
    }))
    .filter((allocation) => allocation.weight > 0);

/**
 * Completes a Basket from its weights. `nav`, `change` and `history` are a hypothetical $10,000 Basket
 * bought at the close 30 days before the last close in lib/data/market-history.json, on real prices;
 * each holding's `change` is its latest real daily change.
 */
const basket = (
  config: Omit<Basket, "allocation" | "history" | "nav" | "change" | "holdings"> & {
    holdings: Omit<Holding, "change">[];
  },
): Basket => {
  const month = backtest(config.holdings, "1M");
  const holdings = config.holdings.map((h) => ({
    ...h,
    change: historicalAsset(h.ticker).change,
  }));
  return {
    ...config,
    holdings,
    nav: month.at(-1)!.basket,
    change:
      Math.round((month.at(-1)!.basket / month[0].basket - 1) * 10_000) / 100,
    allocation: allocationFor(holdings),
    history: month.map((p) => ({ day: shortDate(p.date), value: p.basket })),
  };
};

export const BASKETS: Basket[] = [
  basket({
    slug: "neural",
    name: "NEURAL",
    thesis: "Artificial Intelligence",
    character: "Aggressive growth",
    why: {
      idea: "AI runs on chips, data and software. This Basket owns the companies that build them and the open networks that run AI outside big tech.",
      mix: "NVIDIA (30%) and Alphabet (15%) are the established leaders. Bittensor (20%) and NEAR (10%) are crypto networks for open AI. Gold (10%) and the USDG income portion (15%) soften the swings.",
      fit: "For someone who believes in AI for the long run and can sit through big drops. It is the most aggressive Basket: almost a third is in two volatile crypto networks.",
    },
    id: 1101,
    mandate: "Own the companies and networks behind AI, from chips to open AI networks.",
    block: 63_794_454,
    managementFee: 0.25,
    holdings: [
      {
        ticker: "NVDA",
        name: "Tokenized NVIDIA",
        category: "Tokenized markets",
        weight: 30,
      },
      {
        ticker: "TAO",
        name: "Bittensor",
        category: "Crypto",
        weight: 20,
      },
      {
        ticker: "GOOGL",
        name: "Tokenized Alphabet",
        category: "Tokenized markets",
        weight: 15,
      },
      {
        ticker: "NEAR",
        name: "NEAR",
        category: "Crypto",
        weight: 10,
      },
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 10,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 15,
      },
    ],
  }),
  basket({
    slug: "rails",
    name: "RAILS",
    thesis: "Digital Finance",
    character: "Crypto growth",
    why: {
      idea: "Money is moving onto the internet: stablecoins, crypto exchanges and blockchains that settle payments. This Basket owns the businesses and the networks that carry it.",
      mix: "Coinbase (20%) and Circle (15%), the company behind USDC, are the listed businesses. Ethereum (20%), Solana (15%) and Chainlink (10%) are the networks payments run on. Gold (5%) and USDG income (15%) add ballast.",
      fit: "For someone who expects onchain finance to grow and accepts crypto-sized swings. About 45% is in crypto networks, and the two stocks tend to move with crypto prices too.",
    },
    id: 1202,
    mandate: "Own the companies and networks that move money online.",
    block: 63_794_454,
    managementFee: 0.25,
    holdings: [
      {
        ticker: "COIN",
        name: "Coinbase Stock Token",
        category: "Tokenized markets",
        weight: 20,
      },
      {
        ticker: "CRCL",
        name: "Circle Stock Token",
        category: "Tokenized markets",
        weight: 15,
      },
      {
        ticker: "ETH",
        name: "Ether",
        category: "Crypto",
        weight: 20,
      },
      {
        ticker: "SOL",
        name: "Solana",
        category: "Crypto",
        weight: 15,
      },
      {
        ticker: "LINK",
        name: "Chainlink",
        category: "Crypto",
        weight: 10,
      },
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 5,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 15,
      },
    ],
  }),
  basket({
    slug: "reserve",
    name: "RESERVE",
    thesis: "Diversified Core",
    character: "Balanced",
    why: {
      idea: "One core holding for most markets: growth from US stocks and bitcoin, protection from gold, and a steady income portion.",
      mix: "Bitcoin (30%) and the S&P 500 (25%) drive growth. Gold (20%) has tended to hold up when stocks fall. Ethereum (10%) adds a second crypto, and USDG income (15%) keeps part of the Basket stable.",
      fit: "For someone who wants one Basket to start with and keep. Balanced does not mean safe: bitcoin is the largest position and can fall sharply.",
    },
    id: 1303,
    mandate: "Stocks, bitcoin, gold and income in one balanced mix, for good and bad markets.",
    block: 63_794_454,
    managementFee: 0.25,
    holdings: [
      {
        ticker: "BTC",
        name: "Bitcoin",
        category: "Crypto",
        weight: 30,
      },
      {
        ticker: "SPY",
        name: "Tokenized S&P 500 ETF",
        category: "Tokenized markets",
        weight: 25,
      },
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 20,
      },
      {
        ticker: "ETH",
        name: "Ether",
        category: "Crypto",
        weight: 10,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 15,
      },
    ],
  }),
  basket({
    slug: "frontier",
    name: "FRONTIER",
    thesis: "Future Technology",
    character: "Growth",
    why: {
      idea: "A bet on the technology that comes next: faster chips, electric cars, shared computing power and fast blockchains.",
      mix: "The Nasdaq-100 (25%) gives broad tech exposure. AMD (15%) and Tesla (15%) are focused bets. Render (15%) and Solana (10%) are crypto networks. Gold (5%), oil (5%) and USDG income (10%) balance the mix.",
      fit: "For someone with a long horizon who wants growth beyond a single theme. Expect large swings: it has the smallest income portion of the five Baskets.",
    },
    id: 1404,
    mandate:
      "A Basket for the technologies changing how we compute, travel and pay.",
    block: 63_794_454,
    managementFee: 0.25,
    holdings: [
      {
        ticker: "QQQ",
        name: "Tokenized Nasdaq-100 ETF",
        category: "Tokenized markets",
        weight: 25,
      },
      {
        ticker: "AMD",
        name: "Tokenized AMD",
        category: "Tokenized markets",
        weight: 15,
      },
      {
        ticker: "TSLA",
        name: "Tokenized Tesla",
        category: "Tokenized markets",
        weight: 15,
      },
      {
        ticker: "RENDER",
        name: "Render",
        category: "Crypto",
        weight: 15,
      },
      {
        ticker: "SOL",
        name: "Solana",
        category: "Crypto",
        weight: 10,
      },
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 5,
      },
      {
        ticker: "USO",
        name: "Tokenized oil ETF",
        category: "Real assets",
        weight: 5,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 10,
      },
    ],
  }),
  basket({
    slug: "fortress",
    name: "FORTRESS",
    thesis: "Hard Assets & Income",
    character: "Defensive",
    why: {
      idea: "Built for rough markets: assets that have tended to keep their value when growth stocks fall, plus the largest income portion.",
      mix: "Gold (30%) is the anchor. The S&P 500 (20%) keeps some growth. Bitcoin (15%) and Ethereum (10%) are a small hedge against weaker currencies. USDG income (25%) is the largest of any Basket.",
      fit: "For someone who cares more about protecting value than chasing returns. It can still lose money: gold and crypto both have falling years.",
    },
    id: 1505,
    mandate: "Aims to hold up in rough markets while still earning some income.",
    block: 63_794_454,
    managementFee: 0.25,
    holdings: [
      {
        ticker: "GLD",
        name: "Tokenized gold ETF",
        category: "Real assets",
        weight: 30,
      },
      {
        ticker: "SPY",
        name: "Tokenized S&P 500 ETF",
        category: "Tokenized markets",
        weight: 20,
      },
      {
        ticker: "BTC",
        name: "Bitcoin",
        category: "Crypto",
        weight: 15,
      },
      {
        ticker: "ETH",
        name: "Ether",
        category: "Crypto",
        weight: 10,
      },
      {
        ticker: "USDG",
        name: "USDG DeFi Yield",
        category: "DeFi yield",
        weight: 25,
      },
    ],
  }),
];

export const ASSETS: Record<string, AssetDefinition> = {
  NVDA: {
    name: "NVIDIA",
    description:
      "Follows NVIDIA’s share price through a Robinhood stock token. Availability must be confirmed before real launch.",
    color: "#52734f",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  TAO: {
    name: "Bittensor",
    description:
      "TAO is the coin of Bittensor, an open network for machine learning. Not yet available on Robinhood Chain.",
    color: "#866d46",
    url: "https://docs.bittensor.com/",
  },
  GOOGL: {
    name: "Alphabet",
    description:
      "Follows Alphabet’s share price through a Robinhood stock token.",
    color: "#758b6d",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  NEAR: {
    name: "NEAR",
    description:
      "NEAR is the coin of a network for apps and AI agents. Not yet available on Robinhood Chain.",
    color: "#8a9a88",
    url: "https://docs.near.org/",
  },
  GLD: {
    name: "Gold ETF",
    description:
      "Follows the price of gold through the GLD Robinhood stock token.",
    color: "#b1914d",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  USDG: {
    name: "USDG income",
    description:
      "USDG, a digital dollar, set aside to earn interest. Rates change. The real interest vault has not been integrated yet, so it earns nothing on this test version.",
    color: "#729384",
    url: "https://www.paxos.com/usdg",
  },
  COIN: {
    name: "Coinbase",
    description:
      "Follows Coinbase’s share price through a Robinhood stock token.",
    color: "#496c91",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  CRCL: {
    name: "Circle",
    description:
      "Follows Circle’s share price through a Robinhood stock token.",
    color: "#668b91",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  ETH: {
    name: "Ethereum",
    description:
      "Ether, the coin of the Ethereum network, held as the official token on Robinhood Chain.",
    color: "#8298bb",
    url: "https://ethereum.org/en/eth/",
  },
  SOL: {
    name: "Solana",
    description:
      "SOL is the coin of the Solana network. Not yet available on Robinhood Chain.",
    color: "#7b7ea0",
    url: "https://solana.com/",
  },
  LINK: {
    name: "Chainlink",
    description:
      "LINK is the coin of Chainlink, a network that brings market prices to blockchains. Not yet available on Robinhood Chain.",
    color: "#637fa8",
    url: "https://chain.link/",
  },
  BTC: {
    name: "Bitcoin",
    description:
      "Bitcoin, held as an official token version on Robinhood Chain.",
    color: "#bd8951",
    url: "https://bitcoin.org/",
  },
  SPY: {
    name: "S&P 500 ETF",
    description:
      "Follows 500 large US companies through the SPY Robinhood stock token.",
    color: "#66795e",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  QQQ: {
    name: "Nasdaq-100 ETF",
    description:
      "Follows 100 large tech companies through the QQQ Robinhood stock token.",
    color: "#5f755a",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  AMD: {
    name: "AMD",
    description:
      "Follows AMD’s share price through a Robinhood stock token.",
    color: "#8d6a55",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  TSLA: {
    name: "Tesla",
    description:
      "Follows Tesla’s share price through a Robinhood stock token.",
    color: "#93645f",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
  RENDER: {
    name: "Render",
    description:
      "RENDER is the coin of a network that rents out graphics computing power. Not yet available on Robinhood Chain.",
    color: "#9a735f",
    url: "https://rendernetwork.com/",
  },
  USO: {
    name: "Oil ETF",
    description:
      "Follows the price of oil through the USO Robinhood stock token.",
    color: "#8b7650",
    url: "https://docs.robinhood.com/chain/stock-tokens/",
  },
};

export const ASSET_FACTS: Record<string, { yield?: AssetFact }> = {
  USDG: {
    yield: {
      label: "Income portion",
      detail:
        "This part of the Basket is meant to earn interest in a USDG lending vault. Rates go up and down. The vault’s risks and how quickly you can withdraw must be checked before it is switched on.",
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
      "Example rate from the Morpho app. This vault is a candidate and has not been integrated or tested by Banda yet.",
  },
};

export const yieldSnapshotDate = "2026-09-21T00:00:00.000Z";

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
