"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
type Position = { id: number; slug: string; value: number };
type Wallet = {
  connected: boolean;
  ready: boolean;
  address?: string;
  connecting: boolean;
  error?: string;
  connect: () => void;
  disconnect: () => void;
  balance: number;
  positions: Position[];
  buy: (slug: string, value: number) => void;
  redeem: (id: number) => void;
};
const Context = createContext<Wallet | null>(null);
export function FallbackWalletProvider({ children }: { children: ReactNode }) {
  return (
    <Context.Provider value={{
      connected: false, ready: false, connecting: false,
      connect: () => undefined, disconnect: () => undefined,
      balance: 0, positions: [], buy: () => undefined, redeem: () => undefined,
    }}>
      {children}
    </Context.Provider>
  );
}
export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, logout, login } = usePrivy();
  const { wallets } = useWallets();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();
  const [balance, setBalance] = useState(2500);
  const [positions, setPositions] = useState<Position[]>([]);
  function buy(slug: string, value: number) {
    if (!authenticated || !Number.isFinite(value) || value <= 0 || value > balance)
      return;
    setBalance((b) => b - value);
    setPositions((p) => [...p, { id: Date.now(), slug, value }]);
  }
  function redeem(id: number) {
    const item = positions.find((p) => p.id === id);
    if (item && authenticated) {
      setBalance((b) => b + item.value);
      setPositions((p) => p.filter((x) => x.id !== id));
    }
  }
  async function connect() {
    setConnecting(true);
    setError(undefined);
    try { await login(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Wallet login failed"); }
    finally { setConnecting(false); }
  }
  return (
    <Context.Provider
      value={{
        connected: ready && authenticated && wallets.length > 0,
        ready,
        address: wallets[0]?.address,
        connecting,
        error,
        connect,
        disconnect: () => { void logout(); },
        balance,
        positions,
        buy,
        redeem,
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
