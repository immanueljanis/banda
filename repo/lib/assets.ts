import logos from "./data/asset-logos.json";
export type AssetFact = { label: string; detail: string; source: string };
export const ASSET_FACTS: Record<string, { yield?: AssetFact }> = {
  aUSDC: {
    yield: {
      label: "Lending yield",
      detail:
        "USDC supplied to Aave earns variable lending interest. No fixed rate is promised. Lending interest is excluded from this demo’s historical comparison.",
      source: "https://aave.com/help/supplying/supply-tokens",
    },
  },
  wstETH: {
    yield: {
      label: "Staking yield",
      detail:
        "Lido staking rewards are reflected in the amount of stETH each wstETH represents, rather than extra tokens in your wallet. Rewards vary; the dollar price can still fall.",
      source: "https://docs.lido.fi/contracts/wsteth/",
    },
  },
};
export const ASSETS: Record<
  string,
  { name: string; description: string; color: string; url: string }
> = {
  wBTC: {
    name: "Bitcoin",
    description:
      "Wrapped Bitcoin tracks Bitcoin’s value, in a form that works with this portfolio.",
    color: "#bd8951",
    url: "https://wbtc.network/",
  },
  WETH: {
    name: "Ethereum",
    description:
      "Wrapped Ether is ETH, Ethereum’s native asset, packaged for use in investment apps.",
    color: "#8298bb",
    url: "https://ethereum.org/en/eth/",
  },
  PAXG: {
    name: "Gold",
    description:
      "PAX Gold is a digital token backed by physical gold held in custody.",
    color: "#b9a15d",
    url: "https://paxos.com/paxgold",
  },
  aUSDC: {
    name: "US dollar lending",
    description:
      "Aave USDC represents dollar-linked USDC supplied to Aave’s lending pool. Interest varies and capital is at risk.",
    color: "#799e92",
    url: "https://aave.com/docs/tokens/atoken",
  },
  wstETH: {
    name: "Staked Ethereum",
    description:
      "Wrapped staked Ether represents ETH staked with Lido, including accumulated staking rewards.",
    color: "#9d93b6",
    url: "https://docs.lido.fi/contracts/wsteth/",
  },
  ARB: {
    name: "Arbitrum",
    description:
      "ARB is the governance token for Arbitrum, a network that scales Ethereum.",
    color: "#7a9eb8",
    url: "https://arbitrum.io/",
  },
  GMX: {
    name: "GMX",
    description:
      "GMX is the token of a decentralized exchange for trading crypto and perpetual futures.",
    color: "#9293bc",
    url: "https://gmx.io/",
  },
  PENDLE: {
    name: "Pendle",
    description:
      "Pendle’s token powers a protocol that lets people separate and trade future yield.",
    color: "#729c98",
    url: "https://docs.pendle.finance/pendle-v2/Introduction",
  },
};
export function logoFor(ticker: string) {
  return logos[ticker as keyof typeof logos].path;
}
