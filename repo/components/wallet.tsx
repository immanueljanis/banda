"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createWalletClient,
  custom,
  formatUnits,
  parseUnits,
  publicActions,
  parseAbi,
  type Address,
  type Hash,
} from "viem";
import { BASKETS } from "@/constants/baskets";
import { ROBINHOOD_TESTNET } from "@/lib/chain/config";
import { CANCELLED, friendlyError } from "@/lib/friendly-error";
import { useToast } from "./toast";

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
  deposit: (strategyId: number, amount: string) => Promise<Hash>;
  redeem: (tokenId: string, shares: string) => Promise<Hash>;
  mintTestUsdg: (amount: string) => Promise<Hash>;
  previewRedemption: (tokenId: string, shares: string) => Promise<readonly [bigint, bigint, bigint]>;
  transactionStatus: "idle" | "preparing" | "signing" | "confirming";
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
  deposit: async () => { throw new Error("Wallet provider is not available"); },
  redeem: async () => { throw new Error("Wallet provider is not available"); },
  mintTestUsdg: async () => { throw new Error("Wallet provider is not available"); },
  previewRedemption: async () => { throw new Error("Connect a wallet first"); },
  transactionStatus: "idle",
};

const erc20Abi = [{
  type: "function", name: "approve", stateMutability: "nonpayable",
  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ type: "bool" }],
}] as const;
const diamondAbi = [{
  type: "function", name: "deposit", stateMutability: "nonpayable",
  inputs: [{ name: "strategyId", type: "uint32" }, { name: "assets", type: "uint256" }],
  outputs: [{ type: "uint256" }, { type: "address" }, { type: "uint256" }],
}] as const;
const redeemAbi = [
  {
    type: "function", name: "previewRedeem", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }, { name: "shares", type: "uint256" }],
    outputs: [{ name: "grossAssets", type: "uint256" }, { name: "fee", type: "uint256" }, { name: "netAssets", type: "uint256" }],
  },
  {
    type: "function", name: "redeem", stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "minAssetsOut", type: "uint256" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
] as const;

export function FallbackWalletProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={fallbackValue}>{children}</Context.Provider>;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const transactionLock = useRef(false);
  const { ready, authenticated, logout, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();
  const [portfolio, setPortfolio] = useState<PortfolioResponse>();
  const [portfolioStatus, setPortfolioStatus] =
    useState<Wallet["portfolioStatus"]>("idle");
  const [transactionStatus, setTransactionStatus] =
    useState<Wallet["transactionStatus"]>("idle");
  const toast = useToast();
  const explorerAction = (hash: Hash) => ({ label: "View transaction", href: `${ROBINHOOD_TESTNET.explorer}/tx/${hash}`, external: true });
  const fail = (title: string, reason: unknown) => {
    const message = friendlyError(reason);
    setTransactionStatus("idle");
    setError(message);
    toast(message === CANCELLED ? { tone: "info", title: "Cancelled", description: message } : { tone: "error", title, description: message });
    return new Error(message);
  };

  const activeWallet = useMemo(() => {
    const external = wallets
      .filter((wallet) => !wallet.walletClientType.startsWith("privy"))
      .sort((a, b) => b.connectedAt - a.connectedAt);
    return external[0] ?? wallets[0];
  }, [wallets]);

  const address = activeWallet?.address;

  const prepareNav = useCallback(async (strategyId: number) => {
    const token = await getAccessToken();
    if (!token) throw new Error("Please sign in again to prepare a quote.");
    const response = await fetch(`${process.env.NEXT_PUBLIC_NAV_API_URL ?? ""}/api/nav/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ strategyId }),
      cache: "no-store",
      signal: AbortSignal.timeout(180_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Quote preparation is unavailable. Please retry later.");
  }, [getAccessToken]);

  const prepareRedemption = useCallback(async (tokenId: string) => {
    if (!activeWallet) throw new Error("Connect a wallet first");
    await activeWallet.switchChain(ROBINHOOD_TESTNET.id);
    const provider = await activeWallet.getEthereumProvider();
    const client = createWalletClient({ chain: ROBINHOOD_TESTNET, transport: custom(provider) }).extend(publicActions);
    const [strategyId] = await client.readContract({
      address: ROBINHOOD_TESTNET.diamond,
      abi: parseAbi(["function basket(uint256) view returns (uint32,address,uint256)"]),
      functionName: "basket", args: [BigInt(tokenId)],
    });
    await prepareNav(strategyId);
  }, [activeWallet, prepareNav]);

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
        setError(friendlyError(reason, "Live portfolio unavailable. Please try again."));
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
      const message = friendlyError(reason, "Sign-in did not complete. Please try again.");
      setError(message);
      toast({ tone: "error", title: "Sign-in did not complete", description: message });
    } finally {
      setConnecting(false);
    }
  }

  async function deposit(strategyId: number, amount: string): Promise<Hash> {
    if (!activeWallet || !address) throw new Error("Connect a wallet first");
    const amountUnits = parseUnits(amount, 6);
    if (amountUnits <= BigInt(0)) throw new Error("Enter a positive USDG amount");
    if (!/^\d+(\.\d{1,6})?$/.test(amount)) throw new Error("Use up to six decimal places");
    if (transactionLock.current) throw new Error("A transaction is already in progress");
    transactionLock.current = true;
    setTransactionStatus("preparing");
    setError(undefined);
    try {
      await activeWallet.switchChain(ROBINHOOD_TESTNET.id);
      const provider = await activeWallet.getEthereumProvider();
      const client = createWalletClient({
        account: address as Address,
        chain: ROBINHOOD_TESTNET,
        transport: custom(provider),
      });
      const receiptClient = client.extend(publicActions);
      const guardAbi = parseAbi([
        "function isPaused() view returns (bool)",
        "function strategy(uint32) view returns (address,uint96,uint16,address,bool)",
        "function previewNav(address,uint256) view returns (uint256)",
      ]);
      if (await receiptClient.readContract({address: ROBINHOOD_TESTNET.diamond, abi: guardAbi, functionName: "isPaused"})) throw new Error("Deposits are paused. Please try again later.");
      const [strategy, minimum, , , enabled] = await receiptClient.readContract({address: ROBINHOOD_TESTNET.diamond, abi: guardAbi, functionName: "strategy", args: [strategyId]});
      if (!enabled || amountUnits < minimum) throw new Error(`Minimum deposit is ${formatUnits(minimum, 6)} USDG for this strategy.`);
      const tokenAbi = parseAbi(["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)"]);
      const balance = await receiptClient.readContract({address: ROBINHOOD_TESTNET.settlementAsset, abi: tokenAbi, functionName: "balanceOf", args: [address as Address]});
      if (balance < amountUnits) throw new Error("Insufficient USDG balance");
      await prepareNav(strategyId);
      await receiptClient.readContract({address: ROBINHOOD_TESTNET.diamond, abi: guardAbi, functionName: "previewNav", args: [strategy, amountUnits]});
      const allowance = await receiptClient.readContract({address: ROBINHOOD_TESTNET.settlementAsset, abi: tokenAbi, functionName: "allowance", args: [address as Address, ROBINHOOD_TESTNET.diamond]});
      if (allowance < amountUnits) {
      setTransactionStatus("signing");
      await receiptClient.simulateContract({address: ROBINHOOD_TESTNET.settlementAsset, abi: erc20Abi, functionName: "approve", args: [ROBINHOOD_TESTNET.diamond, amountUnits], account: address as Address});
      const approvalHash = await client.writeContract({
        address: ROBINHOOD_TESTNET.settlementAsset,
        abi: erc20Abi,
        functionName: "approve",
        args: [ROBINHOOD_TESTNET.diamond, amountUnits],
      });
      setTransactionStatus("confirming");
      const approval = await receiptClient.waitForTransactionReceipt({ hash: approvalHash });
      if (approval.status !== "success") throw new Error("Approval reverted. Deposit was not sent.");
      // Approval/signing may take longer than the NAV validity window.
      setTransactionStatus("preparing");
      await prepareNav(strategyId);
      }
      setTransactionStatus("signing");
      await receiptClient.simulateContract({address: ROBINHOOD_TESTNET.diamond, abi: diamondAbi, functionName: "deposit", args: [strategyId, amountUnits], account: address as Address});
      const depositHash = await client.writeContract({
        address: ROBINHOOD_TESTNET.diamond,
        abi: diamondAbi,
        functionName: "deposit",
        args: [strategyId, amountUnits],
      });
      setTransactionStatus("confirming");
      const depositReceipt = await receiptClient.waitForTransactionReceipt({ hash: depositHash });
      if (depositReceipt.status !== "success") throw new Error("Deposit reverted. No Basket was created.");
      setTransactionStatus("idle");
      toast({ tone: "success", title: "Basket deposit confirmed", description: `${amount} USDG is now held in your Basket.`, action: { label: "View portfolio", href: "/portfolio" } });
      await loadPortfolio();
      return depositHash;
    } catch (reason) {
      throw fail("Deposit didn’t go through", reason);
    } finally {
      transactionLock.current = false;
    }
  }

  const previewRedemption = useCallback(async (tokenId: string, shares: string) => {
    if (!activeWallet) throw new Error("Connect a wallet first");
    const provider = await activeWallet.getEthereumProvider();
    const client = createWalletClient({chain: ROBINHOOD_TESTNET, transport: custom(provider)}).extend(publicActions);
    if (await client.getChainId() !== ROBINHOOD_TESTNET.id) throw new Error("Switch your wallet to Robinhood Chain Testnet to preview.");
    return client.readContract({address: ROBINHOOD_TESTNET.diamond, abi: redeemAbi, functionName: "previewRedeem", args: [BigInt(tokenId), parseUnits(shares, 6)]});
  }, [activeWallet]);

  async function redeem(tokenId: string, shares: string): Promise<Hash> {
    if (!activeWallet || !address) throw new Error("Connect a wallet first");
    const sharesUnits = parseUnits(shares, 6);
    if (sharesUnits <= BigInt(0)) throw new Error("Enter a positive share amount");
    if (transactionLock.current) throw new Error("A transaction is already in progress");
    transactionLock.current = true;
    setTransactionStatus("preparing");
    setError(undefined);
    try {
      await activeWallet.switchChain(ROBINHOOD_TESTNET.id);
      const provider = await activeWallet.getEthereumProvider();
      const client = createWalletClient({
        account: address as Address,
        chain: ROBINHOOD_TESTNET,
        transport: custom(provider),
      });
      const receiptClient = client.extend(publicActions);
      await prepareRedemption(tokenId);
      const preview = await receiptClient.readContract({
        address: ROBINHOOD_TESTNET.diamond,
        abi: redeemAbi,
        functionName: "previewRedeem",
        args: [BigInt(tokenId), sharesUnits],
      });
      const minAssetsOut = (preview[2] * BigInt(995)) / BigInt(1000);
      if (minAssetsOut <= BigInt(0)) throw new Error("Payout is too small");
      await receiptClient.simulateContract({address: ROBINHOOD_TESTNET.diamond, abi: redeemAbi, functionName: "redeem", args: [BigInt(tokenId), sharesUnits, minAssetsOut], account: address as Address});
      setTransactionStatus("signing");
      const hash = await client.writeContract({
        address: ROBINHOOD_TESTNET.diamond,
        abi: redeemAbi,
        functionName: "redeem",
        args: [BigInt(tokenId), sharesUnits, minAssetsOut],
      });
      setTransactionStatus("confirming");
      const receipt = await receiptClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Redemption reverted. Your Basket was not redeemed.");
      setTransactionStatus("idle");
      toast({ tone: "success", title: "Redemption confirmed", description: "USDG was sent to your wallet.", action: explorerAction(hash) });
      await loadPortfolio();
      return hash;
    } catch (reason) {
      throw fail("Redemption didn’t go through", reason);
    } finally {
      transactionLock.current = false;
    }
  }

  async function mintTestUsdg(amount: string): Promise<Hash> {
    if (!activeWallet || !address) throw new Error("Connect a wallet first");
    if (!/^\d+(\.\d{1,6})?$/.test(amount)) throw new Error("Use up to six decimal places");
    const amountUnits = parseUnits(amount, 6);
    if (amountUnits <= BigInt(0) || amountUnits > parseUnits("10000", 6)) throw new Error("Mint between 0.000001 and 10,000 test USDG at a time");
    if (transactionLock.current) throw new Error("A transaction is already in progress");
    transactionLock.current = true;
    setTransactionStatus("preparing");
    setError(undefined);
    try {
      await activeWallet.switchChain(ROBINHOOD_TESTNET.id);
      const provider = await activeWallet.getEthereumProvider();
      const client = createWalletClient({ account: address as Address, chain: ROBINHOOD_TESTNET, transport: custom(provider) });
      const receiptClient = client.extend(publicActions);
      const mintAbi = parseAbi(["function mint(address to, uint256 amount)"]);
      const request = { address: ROBINHOOD_TESTNET.settlementAsset, abi: mintAbi, functionName: "mint", args: [address as Address, amountUnits] } as const;
      await receiptClient.simulateContract({ ...request, account: address as Address });
      setTransactionStatus("signing");
      const hash = await client.writeContract(request);
      setTransactionStatus("confirming");
      const receipt = await receiptClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Mint reverted. No test USDG was created.");
      setTransactionStatus("idle");
      toast({ tone: "success", title: `${Number(amount).toLocaleString("en-US")} test USDG minted`, description: "It is ready to deposit.", action: explorerAction(hash) });
      await loadPortfolio();
      return hash;
    } catch (reason) {
      throw fail("Mint didn’t go through", reason);
    } finally {
      transactionLock.current = false;
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
        deposit,
        redeem,
        mintTestUsdg,
        previewRedemption,
        transactionStatus,
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
