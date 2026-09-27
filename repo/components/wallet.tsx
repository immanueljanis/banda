"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { BASKETS } from "@/constants/baskets";

export type WalletPosition = {
  tokenId: string;
  strategyId: number;
  slug: string;
  name: string;
  account: string;
  shares: string;
  displayShares: string;
};

type PortfolioResponse = {
  address: string;
  blockNumber: string;
  settlementBalance: string;
  positions: Array<{
    tokenId: string;
    strategyId: number;
    account: string;
    shares: string;
  }>;
  source: "robinhood-rpc-events";
  fetchedAt: string;
};

type Wallet = {
  connected: boolean;
  ready: boolean;
  address?: string;
  walletName?: string;
  connecting: boolean;
  error?: string;
  connect: () => void;
  disconnect: () => void;
  balance: number;
  balanceLabel: string;
  positions: WalletPosition[];
  portfolioStatus: "idle" | "loading" | "ready" | "error";
  portfolioBlock?: string;
  portfolioFetchedAt?: string;
  refreshPortfolio: () => void;
};

const Context = createContext<Wallet | null>(null);

const fallbackValue: Wallet = {
  connected: false,
  ready: false,
  connecting: false,
  connect: () => undefined,
  disconnect: () => undefined,
  balance: 0,
  balanceLabel: "0.000000",
  positions: [],
  portfolioStatus: "idle",
  refreshPortfolio: () => undefined,
};

export function FallbackWalletProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={fallbackValue}>{children}</Context.Provider>;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, logout, login } = usePrivy();
  const { wallets } = useWallets();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();
  const [portfolio, setPortfolio] = useState<PortfolioResponse>();
  const [portfolioStatus, setPortfolioStatus] =
    useState<Wallet["portfolioStatus"]>("idle");

  const activeWallet = useMemo(() => {
    const external = wallets
      .filter((wallet) => !wallet.walletClientType.startsWith("privy"))
      .sort((a, b) => b.connectedAt - a.connectedAt);
    return external[0] ?? wallets[0];
  }, [wallets]);

  const address = activeWallet?.address;

  const loadPortfolio = useCallback(
    async (signal?: AbortSignal) => {
      if (!address || !authenticated) return;
      setPortfolioStatus("loading");
      setError(undefined);
      try {
        const response = await fetch(`/api/portfolio/${address}`, {
          cache: "no-store",
          signal,
        });
        const body = (await response.json()) as
          | PortfolioResponse
          | { message?: string };
        if (!response.ok || !("positions" in body)) {
          throw new Error(
            "message" in body && body.message
              ? body.message
              : "Live portfolio unavailable",
          );
        }
        setPortfolio(body);
        setPortfolioStatus("ready");
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setPortfolio(undefined);
        setPortfolioStatus("error");
        setError(
          reason instanceof Error ? reason.message : "Live portfolio unavailable",
        );
      }
    },
    [address, authenticated],
  );

  useEffect(() => {
    if (!address || !authenticated) {
      setPortfolio(undefined);
      setPortfolioStatus("idle");
      return;
    }
    const controller = new AbortController();
    void loadPortfolio(controller.signal);
    return () => controller.abort();
  }, [address, authenticated, loadPortfolio]);

  const positions = useMemo<WalletPosition[]>(
    () =>
      (portfolio?.positions ?? []).map((position) => {
        const basket = BASKETS[position.strategyId - 1];
        return {
          ...position,
          slug: basket?.slug ?? "unknown",
          name: basket?.name ?? `Strategy ${position.strategyId}`,
          displayShares: formatUnits(BigInt(position.shares), 6),
        };
      }),
    [portfolio],
  );

  const balanceLabel = portfolio
    ? formatUnits(BigInt(portfolio.settlementBalance), 6)
    : "0.000000";
  const balance = Number(balanceLabel);

  async function connect() {
    setConnecting(true);
    setError(undefined);
    try {
      await login();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Wallet login failed",
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Context.Provider
      value={{
        connected: ready && authenticated && Boolean(activeWallet),
        ready,
        address,
        walletName: activeWallet?.meta.name,
        connecting,
        error,
        connect,
        disconnect: () => {
          void logout();
        },
        balance,
        balanceLabel,
        positions,
        portfolioStatus,
        portfolioBlock: portfolio?.blockNumber,
        portfolioFetchedAt: portfolio?.fetchedAt,
        refreshPortfolio: () => {
          void loadPortfolio();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useWallet() {
  const wallet = useContext(Context);
  if (!wallet) throw new Error("WalletProvider is required");
  return wallet;
}
