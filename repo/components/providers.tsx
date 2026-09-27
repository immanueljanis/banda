"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { FallbackWalletProvider, WalletProvider } from "@/components/wallet";

export function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <FallbackWalletProvider>{children}</FallbackWalletProvider>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google", "wallet"],
        embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
        appearance: { theme: "light", accentColor: "#1b4d3e" },
      }}
    >
      <WalletProvider>{children}</WalletProvider>
    </PrivyProvider>
  );
}
