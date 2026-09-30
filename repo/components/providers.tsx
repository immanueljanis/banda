"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { FallbackWalletProvider, WalletProvider } from "@/components/wallet";
import { ROBINHOOD_TESTNET } from "@/lib/chain/config";
import { ToastProvider } from "@/components/toast";

export function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <ToastProvider><FallbackWalletProvider>{children}</FallbackWalletProvider></ToastProvider>;

  return (
    <ToastProvider>
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google", "wallet"],
        supportedChains: [ROBINHOOD_TESTNET],
        defaultChain: ROBINHOOD_TESTNET,
        embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
        appearance: { theme: "light", accentColor: "#0e4f37" },
      }}
    >
      <WalletProvider>{children}</WalletProvider>
    </PrivyProvider>
    </ToastProvider>
  );
}
