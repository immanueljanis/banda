"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
type Position = { id: number; slug: string; value: number };
type Wallet = {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  balance: number;
  positions: Position[];
  buy: (slug: string, value: number) => void;
  redeem: (id: number) => void;
};
const Context = createContext<Wallet | null>(null);
export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState(2500);
  const [positions, setPositions] = useState<Position[]>([]);
  function buy(slug: string, value: number) {
    if (!connected || !Number.isFinite(value) || value <= 0 || value > balance)
      return;
    setBalance((b) => b - value);
    setPositions((p) => [...p, { id: Date.now(), slug, value }]);
  }
  function redeem(id: number) {
    const item = positions.find((p) => p.id === id);
    if (item) {
      setBalance((b) => b + item.value);
      setPositions((p) => p.filter((x) => x.id !== id));
    }
  }
  return (
    <Context.Provider
      value={{
        connected,
        connect: () => setConnected(true),
        disconnect: () => setConnected(false),
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
