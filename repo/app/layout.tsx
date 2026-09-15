import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/components/wallet";
import { Header, Footer } from "@/components/shell";
import "./globals.css";
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const metadata: Metadata = {
  title: "Banda | A whole portfolio. A single holding.",
  description:
    "An on-chain index provider on Arbitrum. Explore diversified baskets of crypto, commodities and on-chain yield, held as one transferable object.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable}`}>
        <WalletProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          {children}
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
